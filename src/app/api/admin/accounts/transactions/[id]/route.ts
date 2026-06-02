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

        // Delete the transaction
        await (prisma as any).transaction.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
    } catch (error: any) {
        console.error('Delete Transaction Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}
