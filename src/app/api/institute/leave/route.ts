import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { instituteId, userId } = body;

        if (!instituteId || !userId) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1. Remove instituteId from User's instituteIds array
        await prisma.$runCommandRaw({
            update: "User",
            updates: [
                {
                    q: { _id: { "$oid": userId } },
                    u: { "$pull": { instituteIds: { "$oid": instituteId } } }
                }
            ]
        });

        // 2. Remove User from Institute's adminIds array (if they were an admin)
        await prisma.$runCommandRaw({
            update: "Institute",
            updates: [
                {
                    q: { _id: { "$oid": instituteId } },
                    u: { "$pull": { adminIds: { "$oid": userId } } }
                }
            ]
        });

        // 3. Mark TeacherProfile as LEFT or delete it
        try {
            await (prisma as any).teacherProfile.deleteMany({
                where: { userId: userId, instituteId: instituteId }
            });
        } catch (e) {
            console.error('Error deleting teacher profile:', e);
        }

        return NextResponse.json({ message: 'Successfully left the institute' });
    } catch (error) {
        console.error('Leave Institute Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
    }
}
