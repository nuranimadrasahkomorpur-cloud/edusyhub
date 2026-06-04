import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const transactions = await (prisma as any).transaction.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const duplicates: any = [];
        const seen = new Set();
        const deletedIds = [];

        for (const t of transactions) {
            if (t.status !== 'PENDING') continue;
            
            const date = new Date(t.date);
            const rawCat = t.originalCategory || t.category || '';
            const cleanCat = rawCat.trim();
            const key = `${t.studentId}_${cleanCat}_${date.getFullYear()}_${date.getMonth()}`;
            
            if (seen.has(key)) {
                duplicates.push(t);
                deletedIds.push(t.id);
            } else {
                seen.add(key);
            }
        }

        if (deletedIds.length > 0) {
            await (prisma as any).transaction.deleteMany({
                where: { id: { in: deletedIds } }
            });
        }

        const specificTxn = transactions.find((t: any) => t.id.toLowerCase().endsWith('c49b5d'));
        
        return NextResponse.json({ 
            message: 'Search successful', 
            specificTxn
        });

        return NextResponse.json({ 
            message: 'Cleanup successful', 
            totalTransactions: transactions.length,
            deletedCount: deletedIds.length
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
