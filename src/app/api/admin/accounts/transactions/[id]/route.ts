import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json({ message: 'Transaction ID is required' }, { status: 400 });
        }

        const transaction = await (prisma as any).transaction.findUnique({
            where: { id }
        });

        if (!transaction) {
            // Already deleted or doesn't exist, we can safely consider it a success
            return NextResponse.json({ success: true, message: 'Transaction already deleted or not found' });
        }

        // Before deleting, ensure the receiptNo is preserved in the Institute's settings so it's not reused
        if (transaction.receiptNo) {
            const match = transaction.receiptNo.match(/\d+$/);
            if (match) {
                const receiptNum = parseInt(match[0], 10);
                const institute = await (prisma as any).institute.findUnique({
                    where: { id: transaction.instituteId }
                });
                if (institute) {
                    const settings = (institute.notificationSettings as any) || {};
                    if (!settings.lastReceiptNumber || settings.lastReceiptNumber < receiptNum) {
                        settings.lastReceiptNumber = receiptNum;
                        await (prisma as any).institute.update({
                            where: { id: transaction.instituteId },
                            data: { notificationSettings: settings }
                        });
                    }
                }
            }
        }

        // Delete the transaction(s)
        if (transaction.receiptNo) {
            await (prisma as any).transaction.deleteMany({
                where: { 
                    instituteId: transaction.instituteId,
                    receiptNo: transaction.receiptNo
                }
            });
        } else {
            await (prisma as any).transaction.delete({
                where: { id }
            });
        }

        return NextResponse.json({ success: true, message: 'Transaction(s) deleted successfully' });
    } catch (error: any) {
        console.error('Delete Transaction Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}
