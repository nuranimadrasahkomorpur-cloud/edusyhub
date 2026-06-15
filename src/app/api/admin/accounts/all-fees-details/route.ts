import { NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        if (!instituteId) {
            return NextResponse.json({ message: 'instituteId required' }, { status: 400 });
        }

        // Fetch categories to filter out archived ones
        const categories = await (prisma as any).accountCategory.findMany({
            where: { instituteId },
            select: { id: true, name: true, config: true }
        });

        const activeCategories = categories.filter((c: any) => !(c.config?.isArchived === true));
        
        // 1. Fetch pending fees for all students in the institute
        const allPendingFees = await (prisma as any).transaction.findMany({
            where: { instituteId, status: 'PENDING' },
            orderBy: { date: 'asc' }
        });

        const pendingFeesMap: Record<string, any[]> = {};
        for (const f of allPendingFees) {
            if (!f.studentId) continue;
            
            // Filter archived categories
            if (f.categoryId) {
                if (!activeCategories.some((c: any) => c.id === f.categoryId)) continue;
            } else {
                const baseCatName = f.category ? f.category.replace(/\s*\(.*?\)\s*/g, '').trim() : '';
                const hasArchived = categories.some((c: any) => 
                    (c.name === f.category || c.name === baseCatName) && c.config?.isArchived === true
                );
                if (hasArchived) continue;
            }

            let displayCategory = f.category;
            if (displayCategory && displayCategory.includes('মাসিক')) {
                const targetDate = f.status === 'PENDING' ? f.date : (f.createdAt || f.date);
                const d = new Date(targetDate);
                const monthYear = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                const baseCat = displayCategory.replace(/\s*-?\s*\d{4}\s*$/, '').trim();
                displayCategory = `${baseCat} (${monthYear})`;
            }

            const formatted = {
                ...f,
                originalCategory: f.category,
                category: displayCategory
            };

            if (!pendingFeesMap[f.studentId]) pendingFeesMap[f.studentId] = [];
            pendingFeesMap[f.studentId].push(formatted);
        }

        // 2. Fetch all completed income transactions (History)
        const allHistoryTxns = await (prisma as any).transaction.findMany({
            where: {
                instituteId,
                status: 'COMPLETED',
                type: 'INCOME',
                studentId: { not: null }
            },
            orderBy: { date: 'desc' }
        });

        const historyMap: Record<string, any[]> = {};
        const advanceMap: Record<string, number> = {};

        for (const t of allHistoryTxns) {
            if (!t.studentId) continue;

            // Check if it's an advance transaction
            if (t.category && t.category.startsWith('__ADVANCE__')) {
                advanceMap[t.studentId] = (advanceMap[t.studentId] || 0) + t.amount;
                continue; // Do not add to visible history
            }

            if (!historyMap[t.studentId]) historyMap[t.studentId] = [];
            historyMap[t.studentId].push(t);
        }

        // Group history transactions by receiptNo for each student
        const groupedHistoryMap: Record<string, any[]> = {};
        for (const studentId of Object.keys(historyMap)) {
            const txns = historyMap[studentId];
            const receiptMap = new Map<string, any>();
            const groupedTxns: any[] = [];

            for (const t of txns) {
                if (t.receiptNo) {
                    if (receiptMap.has(t.receiptNo)) {
                        const existing = receiptMap.get(t.receiptNo);
                        existing.amount += t.amount;
                        existing.subTransactions.push(t);
                    } else {
                        const copy = { ...t, subTransactions: [t] };
                        receiptMap.set(t.receiptNo, copy);
                        groupedTxns.push(copy);
                    }
                } else {
                    groupedTxns.push({ ...t, subTransactions: [t] });
                }
            }

            // Adjust category names for grouped transactions
            for (const g of groupedTxns) {
                if (g.subTransactions && g.subTransactions.length > 1) {
                    const baseCount: Record<string, number> = {};
                    g.subTransactions.forEach((st: any) => {
                        const base = st.category ? st.category.replace(/\s*\(.*?\)\s*/g, '').trim() : 'অন্যান্য ফি';
                        baseCount[base] = (baseCount[base] || 0) + 1;
                    });
                    const parts = Object.entries(baseCount).map(([base, count]) => {
                        if (count > 1) {
                            const suffix = (base.includes('মাস') || base.includes('বেতন')) ? 'মাস' : 'টি';
                            return `${base} (${count} ${suffix})`;
                        }
                        const singleTxn = g.subTransactions.find((st: any) => (st.category ? st.category.replace(/\s*\(.*?\)\s*/g, '').trim() : 'অন্যান্য ফি') === base);
                        return singleTxn?.category || base;
                    });
                    g.category = parts.join(', ');
                }
            }

            groupedTxns.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            groupedHistoryMap[studentId] = groupedTxns;
        }

        return NextResponse.json({
            pendingFeesMap,
            historyMap: groupedHistoryMap,
            advanceMap
        });
    } catch (error: any) {
        console.error('Failed to get all fees details:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
