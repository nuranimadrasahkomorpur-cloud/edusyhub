import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const { type, amount, category, categoryId, note, date, instituteId } = data;

        if (!instituteId || !type || !amount || !category) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const normalizedType = type.toUpperCase();
        const prefix = normalizedType === 'INCOME' ? 'R-' : 'V-';

        // Find the latest transaction of this type to generate the next receipt number
        const lastTransaction = await (prisma as any).transaction.findFirst({
            where: {
                instituteId,
                type: normalizedType,
                receiptNo: { not: null }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        let nextNumber = 1;
        if (lastTransaction && lastTransaction.receiptNo) {
            const match = lastTransaction.receiptNo.match(/\d+$/);
            if (match) {
                nextNumber = parseInt(match[0], 10) + 1;
            }
        }

        const receiptNo = `${prefix}${nextNumber.toString().padStart(5, '0')}`;

        const transaction = await (prisma as any).transaction.create({
            data: {
                type: normalizedType,
                amount: parseFloat(amount),
                category,
                categoryId: categoryId || null,
                note: note || '',
                receiptNo,
                date: date ? new Date(date) : new Date(),
                status: 'COMPLETED',
                instituteId
            }
        });

        return NextResponse.json({ success: true, transaction });
    } catch (error: any) {
        console.error('Create Transaction Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}
