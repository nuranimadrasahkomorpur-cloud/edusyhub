import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const method = url.searchParams.get('method') || 'prisma';
        const instituteId = url.searchParams.get('instituteId');
        
        let data;
        if (method === 'prisma') {
            data = await (prisma as any).teacherProfile.findMany({
                where: instituteId ? { instituteId } : undefined
            });
        } else {
            data = await (prisma as any).$runCommandRaw({
                find: 'TeacherProfile',
                filter: instituteId ? { instituteId: { $oid: instituteId } } : {}
            });
        }
        
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
