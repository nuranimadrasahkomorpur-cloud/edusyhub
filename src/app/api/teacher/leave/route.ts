import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, instituteId } = body;

        if (!userId || !instituteId) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1. Check if user is an admin of this institute (cannot leave own institute)
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
            select: { adminIds: true }
        });

        if (!institute) {
            return NextResponse.json({ message: 'Institute not found' }, { status: 404 });
        }

        const isOwner = institute.adminIds.some((id: any) => {
            if (!id) return false;
            const idStr = typeof id === 'string' ? id : (id.$oid || id.toString());
            return idStr === userId.toString();
        });

        if (isOwner) {
            return NextResponse.json({
                message: 'Cannot leave an institute you own. Please delete the institute instead.'
            }, { status: 403 });
        }

        // 2. Find and delete the teacher profile
        const teacherProfile = await (prisma as any).teacherProfile.findFirst({
            where: {
                userId: userId,
                instituteId: instituteId
            }
        });

        if (!teacherProfile) {
            return NextResponse.json({
                message: 'You are not a member of this institute'
            }, { status: 404 });
        }

        await (prisma as any).teacherProfile.delete({
            where: { id: teacherProfile.id }
        });

        // 3. Remove institute from user's instituteIds array
        await prisma.$runCommandRaw({
            update: "User",
            updates: [
                {
                    q: { _id: { "$oid": userId } },
                    u: { "$pull": { instituteIds: { "$oid": instituteId } } }
                }
            ]
        });

        // 4. Notify all admins of the institute
        try {
            const instituteData = await prisma.institute.findUnique({
                where: { id: instituteId },
                select: { name: true, adminIds: true }
            });

            const userData = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true }
            });

            if (instituteData && userData) {
                // Create notification for each admin
                for (const rawAdminId of (instituteData.adminIds as any[])) {
                    const adminIdStr = typeof rawAdminId === 'string' ? rawAdminId : (rawAdminId.$oid || rawAdminId.toString());
                    await (prisma as any).$runCommandRaw({
                        insert: 'Notification',
                        documents: [{
                            userId: { $oid: adminIdStr },
                            type: 'TEACHER_LEFT',
                            title: 'শিক্ষক ছেড়ে গেছেন',
                            message: `${userData.name} ${instituteData.name} থেকে চলে গেছেন।`,
                            read: false,
                            metadata: {
                                teacherName: userData.name,
                                instituteName: instituteData.name,
                                instituteId: instituteId,
                                teacherId: userId
                            },
                            createdAt: { $date: new Date().toISOString() }
                        }]
                    });
                }
            }
        } catch (notifError) {
            console.error('Failed to send notifications:', notifError);
            // Don't fail the request if notification fails
        }

        console.log(`User ${userId} left institute ${instituteId}`);
        return NextResponse.json({ message: 'Successfully left the institute' });

    } catch (error) {
        console.error('Leave Institute Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
    }
}
