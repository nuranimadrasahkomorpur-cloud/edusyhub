
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const categories = await (prisma as any).accountCategory.findMany({
            where: { instituteId },
            orderBy: { createdAt: 'desc' }
        });

        // Flatten config for the UI
        const flattenedCategories = categories.map((cat: any) => ({
            ...(cat.config || {}),
            ...cat
        }));

        return NextResponse.json(flattenedCategories);
    } catch (error: any) {
        console.error('Fetch Categories Error:', error);
        return NextResponse.json({ 
            message: 'Internal server error',
            error: error.message,
            availableModels: Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')),
            stack: error.stack
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const { id, instituteId, name, type, amount: rawAmount, recipient, frequency, isFixed, applyFrom, ...rest } = data;

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        // Normalize Enum
        const normalizedType = (type || 'income').toString().toUpperCase();
        
        // Handle Amount
        let normalizedAmount: number | null = null;
        if (typeof rawAmount === 'number') {
            normalizedAmount = rawAmount;
        } else if (typeof rawAmount === 'string' && rawAmount !== 'variable') {
            normalizedAmount = parseFloat(rawAmount);
        }

        // We want to store everything in config for easy reconstruction in the frontend,
        // but also update the primary columns for querying.
        const categoryData = {
            name,
            type: normalizedType as any,
            amount: normalizedAmount,
            recipient,
            frequency,
            isFixed: isFixed ?? true,
            instituteId,
            config: { ...rest, recipient, frequency, isFixed, amount: rawAmount, type } 
        };

        let category;
        const isUpdate = id && id.length > 20;
        
        if (isUpdate) {
            category = await (prisma as any).accountCategory.update({
                where: { id },
                data: categoryData
            });
            
            // If updating, delete existing PENDING transactions so they can be recreated with new settings
            let deleteWhere: any = {
                categoryId: category.id,
                status: 'PENDING'
            };

            if (applyFrom === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                deleteWhere.date = { gte: today };
            }

            await (prisma as any).transaction.deleteMany({
                where: deleteWhere
            });
        } else {
            category = await (prisma as any).accountCategory.create({
                data: categoryData
            });
        }

        // --- BULK TRANSACTION GENERATION ---
        if (normalizedType === 'INCOME' && rest.provider && rest.provider !== 'anyone') {
            const { 
                selectedClasses = [], 
                studentClassAmounts = {},
                studentGroupAmounts = {},
                customStudentAmounts = {},
                studentWaivers = {}, 
                deselectedStudents = {},
                customRecipients = [],
                provider
            } = rest;
            
            const transactionsToCreate: any[] = [];

            if (provider === 'students' && selectedClasses.length > 0) {
                // 1. Fetch all students for targeted classes
                // We use a broader query and filter carefully in-memory to avoid MongoDB Json filter flakiness
                const students = await (prisma as any).user.findMany({
                    where: {
                        role: 'STUDENT',
                        instituteIds: { has: instituteId }
                    }
                });

                // 2. Fetch Class names for the transactions
                const classes = await (prisma as any).class.findMany({
                    where: { id: { in: selectedClasses } }
                });

                // 3. Generate Transactions for Students
                for (const student of students) {
                    const sMetadata = student.metadata || {};
                    const sClassId = sMetadata.classId;
                    if (!sClassId || !selectedClasses.includes(sClassId)) continue;

                    // Skip if student is specifically deselected for this class
                    const deselectedList = deselectedStudents[sClassId] || [];
                    if (deselectedList.includes('__ALL_DESELECTED__') || deselectedList.includes(student.id)) continue;

                    const cls = classes.find((c: any) => c.id === sClassId);
                    
                    // Amount calculation
                    let baseAmount = 0;
                    if (rest.studentAmountType === 'flat') {
                        baseAmount = normalizedAmount || 0;
                    } else if (rest.studentAmountType === 'per-class') {
                        baseAmount = studentClassAmounts[sClassId] || normalizedAmount || 0;
                    } else if (rest.studentAmountType === 'per-group') {
                        const sGroupId = sMetadata.groupId;
                        if (sGroupId && studentGroupAmounts[`${sClassId}-${sGroupId}`]) {
                            baseAmount = studentGroupAmounts[`${sClassId}-${sGroupId}`];
                        } else {
                            baseAmount = studentClassAmounts[sClassId] || normalizedAmount || 0;
                        }
                    }
                    
                    // Multiplier based on Fee Tier
                    const tier = sMetadata.feeTier || 'full';
                    const multiplier = tier === 'half' ? 0.5 : (tier === 'free' ? 0 : 1.0);
                    
                    let finalAmount = (baseAmount * multiplier);

                    // Apply waiver
                    const waiver = studentWaivers?.[sClassId]?.[student.id] || 0;
                    finalAmount -= waiver;

                    // Apply custom amount if explicitly provided — do this BEFORE the finalAmount > 0 check
                    // because a student may have a custom amount even if class-level amount is 0
                    const customAmt = customStudentAmounts?.[sClassId]?.[student.id];
                    if (customAmt !== undefined && customAmt !== null) {
                        finalAmount = customAmt;
                    }

                    if (finalAmount > 0 && !rest.isOptional) {
                        const datesToGenerate: Date[] = [];
                        
                        if (rest.frequencyType === 'fixed' && ['monthly', 'weekly', 'yearly', 'semester'].includes(rest.interval) && rest.startDate) {
                            const start = new Date(rest.startDate);
                            const current = new Date();
                            const end = rest.endDate ? new Date(rest.endDate) : current;
                            const actualEnd = end < start && !rest.endDate ? current : end;
                            
                            const dueTiming = rest.dueTiming || 'start';

                            if (rest.interval === 'weekly') {
                                let currentWeek = new Date(start);
                                while (currentWeek <= actualEnd) {
                                    datesToGenerate.push(new Date(currentWeek));
                                    currentWeek.setDate(currentWeek.getDate() + 7);
                                }
                            } else if (rest.interval === 'semester') {
                                let currentSemester = new Date(start);
                                while (currentSemester <= actualEnd) {
                                    datesToGenerate.push(new Date(currentSemester));
                                    currentSemester.setMonth(currentSemester.getMonth() + 6);
                                }
                            } else if (rest.interval === 'yearly') {
                                let currentYear = new Date(start);
                                while (currentYear <= actualEnd) {
                                    datesToGenerate.push(new Date(currentYear));
                                    currentYear.setFullYear(currentYear.getFullYear() + 1);
                                }
                            } else {
                                // Monthly
                                let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                                const endMonth = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), 1);
                                while (currentMonth <= endMonth) {
                                    datesToGenerate.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
                                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                                }
                            }
                        } else {
                            datesToGenerate.push(new Date());
                        }

                        const existingTransactions = await (prisma as any).transaction.findMany({
                            where: {
                                studentId: student.id,
                                categoryId: category.id
                            }
                        });
                        
                        const existingKeys = new Set(existingTransactions.map((t: any) => {
                            const d = new Date(t.date);
                            if (rest.interval === 'weekly') return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                            if (rest.interval === 'yearly') return `${d.getFullYear()}`;
                            return `${d.getFullYear()}-${d.getMonth()}`;
                        }));

                        for (const targetDate of datesToGenerate) {
                            let dateKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}`;
                            if (rest.interval === 'weekly') dateKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`;
                            if (rest.interval === 'yearly') dateKey = `${targetDate.getFullYear()}`;

                            let shouldCreate = false;
                            
                            if (rest.frequencyType === 'fixed' && ['monthly', 'weekly', 'yearly', 'semester'].includes(rest.interval) && rest.startDate) {
                                if (!existingKeys.has(dateKey)) {
                                    shouldCreate = true;
                                }
                            } else {
                                if (existingTransactions.length === 0) {
                                    shouldCreate = true;
                                    existingTransactions.push({ id: 'dummy' }); 
                                }
                            }

                            if (shouldCreate) {
                                transactionsToCreate.push({
                                    amount: finalAmount,
                                    type: 'INCOME',
                                    category: name,
                                    categoryId: category.id,
                                    studentId: student.id,
                                    studentName: student.name,
                                    classId: sClassId,
                                    className: cls?.name,
                                    status: 'PENDING',
                                    instituteId,
                                    date: targetDate
                                });
                            }
                        }
                    }
                }
            } else if (provider === 'custom' && customRecipients.length > 0) {
                // Generate transactions for custom recipients
                for (const rec of customRecipients) {
                    if (!rec.name || !rec.amount) continue;
                    
                    transactionsToCreate.push({
                        amount: rec.amount,
                        type: normalizedType,
                        category: name,
                        categoryId: category.id,
                        studentName: rec.name, // Using studentName field for any recipient name for now
                        status: 'PENDING',
                        instituteId,
                        date: new Date()
                    });
                }
            }

            if (transactionsToCreate.length > 0) {
                await (prisma as any).transaction.createMany({
                    data: transactionsToCreate
                });
            }
        }
        // ------------------------------------

        const responseData = {
            ...(category.config || {}),
            ...category
        };

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error('Save Category Error:', error);
        return NextResponse.json({ 
            message: 'Internal server error',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    return POST(req);
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const deletePaid = searchParams.get('deletePaid') === 'true';

        if (!id) {
            return NextResponse.json({ message: 'ID is required' }, { status: 400 });
        }

        // Enforce: Always preserve PAID transactions.
        // Delete ONLY PENDING transactions for this category
        await (prisma as any).transaction.deleteMany({
            where: {
                categoryId: id,
                status: 'PENDING'
            }
        });

        // Keep the category as 'Archived' so past paid records remain linked with their cycle names
        const existingCat = await (prisma as any).accountCategory.findUnique({
            where: { id }
        });
        if (existingCat) {
            const config = typeof existingCat.config === 'object' ? existingCat.config : {};
            await (prisma as any).accountCategory.update({
                where: { id },
                data: {
                    config: {
                        ...config,
                        isArchived: true
                    }
                }
            });
        }

        return NextResponse.json({ message: 'Category archived and associated pending dues deleted successfully' });
    } catch (error) {
        console.error('Delete Category Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
