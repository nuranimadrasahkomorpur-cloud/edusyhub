import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const studentId = searchParams.get('studentId');
        const role = searchParams.get('role');

        const where: any = {};
        // If querying for a specific student, only filter by studentId
        // (don't also require instituteId match — there may be slight ID format differences)
        if (studentId) {
            where.studentId = studentId;
        } else {
            // For the main accounts dashboard, always filter by instituteId
            if (!instituteId) {
                return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
            }
            where.instituteId = instituteId;
        }
        if (role) where.role = role;

        const transactions = await (prisma as any).transaction.findMany({
            where,
            orderBy: { updatedAt: 'desc' }
        });

        // Load categories to check existence for orphaned dues checking and exclusion flags
        let categoryNames = new Set<string>();
        let categoryIds = new Set<string>();
        let categoryMap = new Map<string, any>();
        
        const targetInstituteId = instituteId || (transactions.length > 0 ? transactions[0].instituteId : null);
        if (targetInstituteId) {
            const categories = await (prisma as any).accountCategory.findMany({
                where: { instituteId: targetInstituteId },
                select: { id: true, name: true, config: true }
            });
            categories.forEach((c: any) => {
                if (c.name) categoryNames.add(c.name.trim().toLowerCase());
                if (c.id) {
                    const idStr = c.id.toString();
                    categoryIds.add(idStr);
                    categoryMap.set(idStr, c);
                }
            });
        }

        // Fetch student user metadata to attach profile images and institute-specific student IDs
        const studentIdsToFetch = Array.from(
            new Set(transactions.map((t: any) => t.studentId ? t.studentId.toString() : null).filter(Boolean))
        ) as string[];

        let students: any[] = [];
        if (studentIdsToFetch.length > 0) {
            students = await (prisma as any).user.findMany({
                where: {
                    id: { in: studentIdsToFetch }
                },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    metadata: true
                }
            });
        }

        const studentMap = new Map(students.map(s => [s.id.toString(), s]));
        const transactionsWithStudentInfo = transactions.map((t: any) => {
            const rawTx = typeof t.toJSON === 'function' ? t.toJSON() : t;
            
            const categoryNameLower = t.category ? t.category.trim().toLowerCase() : '';
            const catIdStr = t.categoryId ? t.categoryId.toString() : '';
            const categoryExists = categoryNames.has(categoryNameLower) || (catIdStr && categoryIds.has(catIdStr));

            let displayCategory = rawTx.category;
            const catInfo = catIdStr ? categoryMap.get(catIdStr) : null;
            const interval = catInfo?.config?.interval;
            const frequencyType = catInfo?.config?.frequencyType;

            if (frequencyType === 'fixed' && interval) {
                const targetDate = rawTx.date;
                const d = new Date(targetDate);
                
                let cycleName = '';
                if (interval === 'monthly') {
                    cycleName = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                } else if (interval === 'yearly') {
                    cycleName = d.toLocaleDateString('bn-BD', { year: 'numeric' });
                } else if (interval === 'semester') {
                    const half = d.getMonth() < 6 ? '১ম' : '২য়';
                    cycleName = `${half} ষান্মাসিক, ${d.toLocaleDateString('bn-BD', { year: 'numeric' })}`;
                } else if (interval === 'weekly') {
                    // Approximate week number in month
                    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
                    const week = Math.ceil((d.getDate() + firstDay) / 7);
                    cycleName = `সপ্তাহ ${week.toLocaleString('bn-BD')}, ${d.toLocaleDateString('bn-BD', { month: 'short', year: 'numeric' })}`;
                }
                
                if (cycleName) {
                    const baseCat = displayCategory.replace(/\s*\(.*\)\s*$/, '').trim(); 
                    displayCategory = `${baseCat} (${cycleName})`;
                }
            } else if (displayCategory && displayCategory.includes('মাসিক')) {
                const targetDate = rawTx.date;
                const d = new Date(targetDate);
                const monthYear = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                const baseCat = displayCategory.replace(/\s*-?\s*\d{4}\s*$/, '').trim();
                displayCategory = `${baseCat} (${monthYear})`;
            }

            let studentInfo = {
                studentUniqueId: t.studentId ? t.studentId.toString() : null,
                studentPhoto: null as string | null,
                fatherName: null as string | null,
                mobileNumber: null as string | null
            };

            if (t.studentId) {
                const sId = t.studentId.toString();
                const s = studentMap.get(sId);
                if (s) {
                    const metadata = s.metadata && typeof s.metadata === 'object' ? s.metadata : {};
                    studentInfo.studentUniqueId = metadata.studentId || sId;
                    studentInfo.studentPhoto = metadata.studentPhoto || null;
                    studentInfo.fatherName = metadata.fathersName || metadata.guardianName || null;
                    studentInfo.mobileNumber = metadata.fathersPhone || metadata.guardianPhone || s.phone || null;
                    // Use className from transaction record first, fallback to student metadata
                    if (!rawTx.className && metadata.className) {
                        (studentInfo as any).className = metadata.className;
                    }
                }
            }


            let dueDate = new Date(rawTx.date);
            if (catInfo?.config) {
                const config = catInfo.config;
                const dueTiming = config.dueTiming || 'start';
                const dueDays = Number(config.dueDays) || 0;
                
                if (config.interval === 'monthly') {
                    if (dueTiming === 'end') {
                        dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDays || 1);
                    } else {
                        dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDays || 1);
                    }
                } else if (config.interval === 'weekly') {
                    if (dueTiming === 'end') dueDate.setDate(dueDate.getDate() + 7);
                    dueDate.setDate(dueDate.getDate() + dueDays);
                } else if (config.interval === 'semester') {
                    if (dueTiming === 'end') dueDate.setMonth(dueDate.getMonth() + 6);
                    dueDate.setDate(dueDate.getDate() + dueDays);
                } else if (config.interval === 'yearly') {
                    if (dueTiming === 'end') dueDate.setFullYear(dueDate.getFullYear() + 1);
                    dueDate.setDate(dueDate.getDate() + dueDays);
                }
            }

            let isArchived = false;
            if (catInfo) {
                isArchived = catInfo.config?.isArchived || false;
            } else {
                for (const cat of categoryMap.values()) {
                    if (cat.name === rawTx.category && cat.config?.isArchived) {
                        isArchived = true;
                        break;
                    }
                }
            }

            const isExcludedFromSummary = catInfo?.config?.isExcludedFromSummary || false;

            return {
                ...rawTx,
                originalCategory: rawTx.category,
                category: displayCategory,
                dueDate: dueDate.toISOString(),
                ...studentInfo,
                categoryExists: !!categoryExists,
                isExcludedFromSummary,
                isArchived
            };
        });

        // Advance balance: stored separately as __ADVANCE__ category transactions
        const advanceBalance = transactionsWithStudentInfo
            .filter((t: any) => t.type === 'INCOME' && t.status === 'COMPLETED' && typeof t.category === 'string' && t.category.startsWith('__ADVANCE__'))
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        // Total income excludes advance entries (they are not real income, just prepayments)
        const totalIncome = transactionsWithStudentInfo
            .filter((t: any) => t.type === 'INCOME' && t.status === 'COMPLETED' && !t.isExcludedFromSummary && !(typeof t.category === 'string' && t.category.startsWith('__ADVANCE__')))
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const totalExpense = transactionsWithStudentInfo
            .filter((t: any) => t.type === 'EXPENSE' && t.status === 'COMPLETED' && !t.isExcludedFromSummary)
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const pendingFees = transactionsWithStudentInfo
            .filter((t: any) => t.type === 'INCOME' && t.status === 'PENDING' && !t.isExcludedFromSummary && !t.isArchived)
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const balance = totalIncome - totalExpense;

        // For now, these are fixed, but could be calculated by comparing with previous month
        const summary = {
            totalIncome,
            totalExpense,
            pendingFees,
            balance,
            advanceBalance,
            incomeChange: '+0%',
            expenseChange: '+0%',
            pendingChange: '+0%',
            balanceChange: '+0%'
        };

        const response = NextResponse.json({
            summary,
            transactions: transactionsWithStudentInfo
        });
        response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return response;
    } catch (error: any) {
        console.error('Accounts API Error:', error);
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
        const { instituteId, ...rest } = data;

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const transaction = await (prisma as any).transaction.create({
            data: {
                ...rest,
                instituteId,
                date: new Date(rest.date || Date.now()),
                createdAt: new Date(rest.date || Date.now())
            }
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error('Create Transaction Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const categoryName = searchParams.get('category');

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }
        if (!categoryName) {
            return NextResponse.json({ message: 'Category name is required' }, { status: 400 });
        }

        // Verify if category does NOT exist in the AccountCategory collection
        const existingCategory = await (prisma as any).accountCategory.findFirst({
            where: {
                instituteId,
                name: {
                    equals: categoryName,
                    mode: 'insensitive'
                }
            }
        });

        if (existingCategory) {
            return NextResponse.json({ message: 'This category exists, cannot delete as orphaned' }, { status: 400 });
        }

        // Delete pending transactions of this category name for the given institute
        const deleteResult = await (prisma as any).transaction.deleteMany({
            where: {
                instituteId,
                category: categoryName,
                status: 'PENDING'
            }
        });

        return NextResponse.json({ 
            message: 'Orphaned pending dues deleted successfully', 
            count: deleteResult.count 
        });
    } catch (error: any) {
        console.error('Delete Orphaned Dues Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}
