import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export const dynamic = 'force-dynamic';

// GET: fetch custom columns for an institute
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const result = await (prisma as any).$runCommandRaw({
            find: 'Institute',
            filter: { _id: { $oid: instituteId } },
            projection: { customStudentColumns: 1 },
            limit: 1
        });

        const inst = result.cursor?.firstBatch?.[0];
        if (!inst) {
            return NextResponse.json({ message: 'Institute not found' }, { status: 404 });
        }

        return NextResponse.json(inst.customStudentColumns || []);
    } catch (error) {
        console.error('Custom Columns GET Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: save custom columns array for an institute
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { instituteId, customStudentColumns } = body;

        if (!instituteId || !Array.isArray(customStudentColumns)) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        await (prisma as any).$runCommandRaw({
            update: 'Institute',
            updates: [
                {
                    q: { _id: { $oid: instituteId } },
                    u: { $set: { customStudentColumns } }
                }
            ]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Custom Columns PATCH Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
