import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        // Create indexes to drastically speed up student queries
        const result = await (prisma as any).$runCommandRaw({
            createIndexes: 'User',
            indexes: [
                {
                    key: { role: 1, instituteIds: 1, createdAt: -1 },
                    name: 'idx_student_sort_optimized'
                }
            ]
        });

        return NextResponse.json({ success: true, result });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message, stack: e.stack });
    }
}
