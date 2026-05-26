import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        // Announcements can be public or semi-private, but we'll require a session for now
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        const announcements = await prisma.announcement.findMany({
            where: {
                active: true,
                OR: [
                    { type: 'GLOBAL' },
                    { instituteId: instituteId || undefined }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return NextResponse.json(announcements);
    } catch (error: any) {
        return NextResponse.json({ message: 'Error', error: error.message }, { status: 500 });
    }
}
