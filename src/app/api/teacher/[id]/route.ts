import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

// DELETE - Admin removes a teacher from institute
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const teacherId = id;
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const adminId = searchParams.get('adminId');

        if (!teacherId || !instituteId || !adminId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify requester is admin of this institute
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
            select: { name: true, adminIds: true }
        });

        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const isAdmin = institute.adminIds.some((id: any) => {
            if (!id) return false;
            const idStr = typeof id === 'string' ? id : (id.$oid || id.toString());
            return idStr === adminId.toString();
        });

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Only admins can remove teachers' }, { status: 403 });
        }

        // 2. Cannot remove another admin
        const isTeacherAdmin = institute.adminIds.some((id: any) => {
            if (!id) return false;
            const idStr = typeof id === 'string' ? id : (id.$oid || id.toString());
            return idStr === teacherId.toString();
        });

        if (isTeacherAdmin) {
            return NextResponse.json({ error: 'Cannot remove an admin using this endpoint' }, { status: 403 });
        }

        // 3. Find and delete the teacher profile
        const teacherProfile = await (prisma as any).teacherProfile.findFirst({
            where: {
                userId: teacherId,
                instituteId: instituteId
            }
        });

        if (!teacherProfile) {
            return NextResponse.json({ error: 'Teacher not found in this institute' }, { status: 404 });
        }

        await (prisma as any).teacherProfile.delete({
            where: { id: teacherProfile.id }
        });

        // 4. Remove institute from teacher's instituteIds
        await prisma.$runCommandRaw({
            update: "User",
            updates: [{
                q: { _id: { "$oid": teacherId } },
                u: { "$pull": { instituteIds: { "$oid": instituteId } } }
            }]
        });

        // 5. Notify the removed teacher
        try {
            const teacherData = await prisma.user.findUnique({
                where: { id: teacherId },
                select: { name: true }
            });

            if (teacherData) {
                await (prisma as any).$runCommandRaw({
                    insert: 'Notification',
                    documents: [{
                        userId: { $oid: teacherId },
                        type: 'TEACHER_REMOVED',
                        title: 'আপনাকে প্রতিষ্ঠান থেকে সরানো হয়েছে',
                        message: `আপনাকে ${institute.name} থেকে সরানো হয়েছে।`,
                        read: false,
                        metadata: {
                            instituteName: institute.name,
                            instituteId: instituteId,
                            removedBy: adminId
                        },
                        createdAt: { $date: new Date().toISOString() }
                    }]
                });
            }
        } catch (notifError) {
            console.error('Failed to send notification:', notifError);
        }

        console.log(`Teacher ${teacherId} removed from institute ${instituteId} by admin ${adminId}`);
        return NextResponse.json({ message: 'Teacher removed successfully' });

    } catch (error) {
        console.error('Remove Teacher Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
