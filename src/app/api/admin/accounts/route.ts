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

        // Resolve target institute ID for config mapping
        let targetInstituteId = instituteId;
        if (!targetInstituteId && studentId) {
            const firstTx = await (prisma as any).transaction.findFirst({
                where: { studentId },
                select: { instituteId: true }
            });
            if (firstTx) {
                targetInstituteId = firstTx.instituteId.toString();
            } else {
                const user = await (prisma as any).user.findUnique({
                    where: { id: studentId },
                    select: { instituteIds: true, defaultInstituteId: true }
                });
                targetInstituteId = user?.defaultInstituteId?.toString() || user?.instituteIds?.[0]?.toString() || null;
            }
        }

        // Load categories to check existence for orphaned dues checking and exclusion flags
        const categoryNames = new Set<string>();
        const categoryIds = new Set<string>();
        const categoryMap = new Map<string, any>();
        
        const excludedCategoryIds: string[] = [];
        const excludedCategoryNames: string[] = [];
        const archivedCategoryIds: string[] = [];
        const archivedCategoryNames: string[] = [];

        if (targetInstituteId) {
            const categories = await (prisma as any).accountCategory.findMany({
                where: { instituteId: targetInstituteId },
                select: { id: true, name: true, config: true }
            });
            categories.forEach((c: any) => {
                const idStr = c.id.toString();
                if (c.name) {
                    const nameLower = c.name.trim().toLowerCase();
                    categoryNames.add(nameLower);
                    categoryMap.set(nameLower, c);
                }
                if (c.id) {
                    categoryIds.add(idStr);
                    categoryMap.set(idStr, c);
                }

                const config = c.config && typeof c.config === 'object' ? c.config : {};
                if (config.isExcludedFromSummary === true) {
                    excludedCategoryIds.push(idStr);
                    if (c.name) excludedCategoryNames.push(c.name);
                }
                if (config.isArchived === true) {
                    archivedCategoryIds.push(idStr);
                    if (c.name) archivedCategoryNames.push(c.name);
                }
            });
        }

        // Compute stats using native DB aggregations for maximum speed
        // 1. Advance balance
        const advanceAgg = await (prisma as any).transaction.aggregate({
            where: {
                ...where,
                type: 'INCOME',
                status: 'COMPLETED',
                category: {
                    startsWith: '__ADVANCE__'
                }
            },
            _sum: {
                amount: true
            }
        });
        const advanceBalance = advanceAgg._sum.amount || 0;

        // 2. Total income (excludes advance entries and excluded categories)
        const incomeAgg = await (prisma as any).transaction.aggregate({
            where: {
                ...where,
                type: 'INCOME',
                status: 'COMPLETED',
                NOT: [
                    {
                        category: {
                            startsWith: '__ADVANCE__'
                        }
                    },
                    ...(excludedCategoryNames.length > 0 ? [{
                        category: {
                            in: excludedCategoryNames
                        }
                    }] : []),
                    ...(excludedCategoryIds.length > 0 ? [{
                        categoryId: {
                            in: excludedCategoryIds
                        }
                    }] : [])
                ]
            },
            _sum: {
                amount: true
            }
        });
        const totalIncome = incomeAgg._sum.amount || 0;

        // 3. Total expense (excludes excluded categories)
        const expenseAgg = await (prisma as any).transaction.aggregate({
            where: {
                ...where,
                type: 'EXPENSE',
                status: 'COMPLETED',
                NOT: [
                    ...(excludedCategoryNames.length > 0 ? [{
                        category: {
                            in: excludedCategoryNames
                        }
                    }] : []),
                    ...(excludedCategoryIds.length > 0 ? [{
                        categoryId: {
                            in: excludedCategoryIds
                        }
                    }] : [])
                ]
            },
            _sum: {
                amount: true
            }
        });
        const totalExpense = expenseAgg._sum.amount || 0;

        // 4. Pending fees (excludes archived and excluded categories)
        const pendingAgg = await (prisma as any).transaction.aggregate({
            where: {
                ...where,
                type: 'INCOME',
                status: 'PENDING',
                NOT: [
                    ...(excludedCategoryNames.length > 0 || archivedCategoryNames.length > 0 ? [{
                        category: {
                            in: [...excludedCategoryNames, ...archivedCategoryNames]
                        }
                    }] : []),
                    ...(excludedCategoryIds.length > 0 || archivedCategoryIds.length > 0 ? [{
                        categoryId: {
                            in: [...excludedCategoryIds, ...archivedCategoryIds]
                        }
                    }] : [])
                ]
            },
            _sum: {
                amount: true
            }
        });
        const pendingFees = pendingAgg._sum.amount || 0;

        const balance = totalIncome - totalExpense;

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

        // Fetch limited transactions to optimize performance
        const txWhere = { ...where };
        const status = searchParams.get('status');
        if (status) {
            txWhere.status = status;
        }

        const limit = studentId ? undefined : 300;
        const transactions = await (prisma as any).transaction.findMany({
            where: txWhere,
            orderBy: { updatedAt: 'desc' },
            ...(limit ? { take: limit } : {})
        });

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
            const catInfo = catIdStr ? categoryMap.get(catIdStr) : (categoryNameLower ? categoryMap.get(categoryNameLower) : null);
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
