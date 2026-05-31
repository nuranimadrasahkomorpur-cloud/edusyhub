import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET() {
    try {
        const session = await getServerSession();
        const userId = session?.user?.id;

        const users = await prisma.user.findMany({
            select: { id: true, name: true, role: true, email: true }
        });

        const institutes = await prisma.institute.findMany({
            select: { id: true, name: true, adminIds: true }
        });

        const profiles = await prisma.teacherProfile.findMany({
            select: { id: true, userId: true, instituteId: true, status: true, isAdmin: true }
        });

        return NextResponse.json({
            userId,
            users,
            institutes,
            profiles
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message });
    }
}
