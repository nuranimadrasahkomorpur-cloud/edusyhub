import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        if (!instituteId) return NextResponse.json({ message: 'instituteId required' }, { status: 400 });

        const institute = await (prisma as any).$runCommandRaw({
            find: 'Institute',
            filter: { _id: { $oid: instituteId } },
            limit: 1
        });
        const inst = institute.cursor?.firstBatch?.[0];
        if (!inst) return NextResponse.json({ message: 'Institute not found' }, { status: 404 });

        return NextResponse.json(inst.printSettings || null);
    } catch (error) {
        console.error('Fetch print settings error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { instituteId, printSettings } = body;
        if (!instituteId || printSettings === undefined) return NextResponse.json({ message: 'Missing fields' }, { status: 400 });

        const { id: userId, role } = session.user as any;

        // Authorization: allow SUPER_ADMIN or institute admin
        if (role !== 'SUPER_ADMIN') {
            const found = await (prisma as any).$runCommandRaw({
                find: 'Institute',
                filter: { _id: { $oid: instituteId }, adminIds: { $oid: userId } },
                limit: 1
            });
            const exists = (found.cursor?.firstBatch || []).length > 0;
            if (!exists) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await (prisma as any).$runCommandRaw({
            update: 'Institute',
            updates: [
                { q: { _id: { $oid: instituteId } }, u: { $set: { printSettings } } }
            ]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update print settings error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
