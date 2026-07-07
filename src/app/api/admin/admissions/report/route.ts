import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        // Must be admin or teacher of this institute
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { instituteIds: true }
        });

        if (!user?.instituteIds.includes(instituteId)) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const drafts = await prisma.admissionDraft.groupBy({
            by: ['status'],
            where: { instituteId },
            _count: { status: true }
        });

        let totalIssued = 0;
        let totalSubmitted = 0;

        for (const draft of drafts) {
            if (draft.status === 'SUBMITTED') {
                totalSubmitted = draft._count.status;
            }
            totalIssued += draft._count.status;
        }

        return NextResponse.json({
            totalIssued,
            totalSubmitted,
            dropOffs: totalIssued - totalSubmitted
        });

    } catch (error) {
        console.error('Error fetching admission report:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
