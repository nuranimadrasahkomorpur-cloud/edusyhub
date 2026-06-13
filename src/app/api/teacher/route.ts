
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('instituteId');

    if (!instituteId) {
        return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    try {
        // Fetch all TeacherProfiles for this institute
        const teacherProfiles = await prisma.teacherProfile.findMany({
            where: {
                instituteId: instituteId
            }
        });

        // Extract userIds
        const userIds = teacherProfiles.map(p => p.userId);

        // Fetch valid users
        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true
            }
        });

        // Create a map for quick lookup
        const userMap = new Map(users.map(u => [u.id, u]));

        // Filter out orphaned profiles and format the response
        const teachers = teacherProfiles
            .filter(profile => userMap.has(profile.userId))
            .map((profile) => {
                const user = userMap.get(profile.userId)!;
                return {
                    id: profile.id,
                    instituteId: profile.instituteId,
                    userId: profile.userId,
                    status: profile.status || 'ACTIVE',
                    assignedClassIds: profile.assignedClassIds || [],
                    permissions: profile.permissions || {},
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role
                    }
                };
            });

        return NextResponse.json(teachers);
    } catch (error) {
        console.error('Fetch teachers error:', error);
        return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }
}
