import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET() {
    try {
        const updated = await (prisma as any).teacherProfile.updateMany({
            where: { status: 'PENDING' },
            data: { status: 'ACTIVE' }
        });
        return NextResponse.json({ success: true, updated });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
