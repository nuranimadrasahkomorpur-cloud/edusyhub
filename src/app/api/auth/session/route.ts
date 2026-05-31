import { NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';
import prisma from '@/utils/db';

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ user: null });
        }

        // Fetch user with institutes and teacherProfiles from DB
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                institutes: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        logo: true,
                        coverImage: true,
                        address: true,
                        adminIds: true
                    }
                },
                teacherProfiles: true
            }
        });

        if (!user) {
            return NextResponse.json({ user: null });
        }

        const userId = user.id;
        const formattedUser = {
            id: userId,
            email: user.email || '',
            role: user.role || 'STUDENT',
            name: user.name || '',
            phone: user.phone || '',
            metadata: user.metadata || {},
            defaultInstituteId: user.defaultInstituteId || null,
            institutes: (user.institutes || []).map((inst: any) => ({
                ...inst,
                isOwner: (inst.adminIds || []).map((id: any) => id.toString()).includes(userId.toString())
            })),
            teacherProfiles: user.teacherProfiles || []
        };

        return NextResponse.json({ user: formattedUser });
    } catch (error) {
        console.error('Session Endpoint Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
