
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const teacherProfileId = id;
    try {
        const body = await request.json();
        const { permissions, assignedClassIds, isAdmin, adminId, instituteId } = body;

        console.log('Update Permissions Request:', { teacherProfileId, adminId, instituteId, permissions });

        // Verify the requester is an admin
        if (!teacherProfileId || !adminId || !instituteId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if the requester is actually an owner (adminId in Institute.adminIds) or a global SUPER_ADMIN
        const institute = await (prisma as any).institute.findUnique({
            where: { id: instituteId },
            select: {
                id: true,
                name: true,
                address: true,
                logo: true,
                adminIds: true
            }
        });

        // Fetch requester to check for SUPER_ADMIN role
        const requester = await prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true }
        });

        const isOwner = institute?.adminIds ? institute.adminIds.some((id: any) => {
            if (!id) return false;
            const idStr = typeof id === 'string' ? id : (id.$oid || id.toString());
            return idStr === adminId.toString();
        }) : false;
        const isSuperAdmin = requester?.role === 'SUPER_ADMIN';

        if (!institute || (!isOwner && !isSuperAdmin)) {
            return NextResponse.json({ error: 'Unauthorized: Only owners can modify teacher roles' }, { status: 403 });
        }

        const dataToUpdate: any = {
            isAdmin
        };

        if (permissions !== undefined) dataToUpdate.permissions = permissions;
        if (assignedClassIds !== undefined) dataToUpdate.assignedClassIds = assignedClassIds;

        const updatedProfile = await (prisma as any).teacherProfile.update({
            where: {
                id: teacherProfileId
            },
            data: dataToUpdate
        });

        // --- Create Notification ---
        try {
            // Permission Labels (Keep consistent with frontend)
            const LABELS: any = {
                canTakeAttendance: 'উপস্থিতি',
                canManageResult: 'ফলাফল',
                canCollectFees: 'ফি কালেকশন',
                canManageAdmission: 'ভর্তি ও স্টুডেন্ট',
                canManageExam: 'পরীক্ষা',
                canManageRoutine: 'রুটিন'
            };

            const permissionDetails: string[] = [];

            if (permissions?.classWise) {
                const classIds = Object.keys(permissions.classWise);
                if (classIds.length > 0) {
                    const classes = await (prisma as any).class.findMany({
                        where: { id: { in: classIds } },
                        select: { id: true, name: true }
                    });

                    const classMap = classes.reduce((acc: any, cls: any) => {
                        acc[cls.id] = cls.name;
                        return acc;
                    }, {});

                    classIds.forEach((cId: string) => {
                        const classConfig = permissions.classWise[cId];
                        let permsArray: string[] = [];
                        if (Array.isArray(classConfig)) {
                            permsArray = classConfig;
                        } else if (classConfig && typeof classConfig === 'object') {
                            permsArray = classConfig.permissions || [];
                        }

                        if (permsArray.length > 0) {
                            const permLabels = permsArray.map((p: string) => LABELS[p] || p).join(', ');
                            permissionDetails.push(`${classMap[cId] || 'Unknown Class'}: ${permLabels}`);
                        }
                    });
                }
            }

            await (prisma as any).notification.create({
                data: {
                    userId: updatedProfile.userId,
                    type: 'PERMISSION_UPDATE',
                    title: 'অনুমতি আপডেট',
                    message: `${institute.name} এ আপনার পারমিশন আপডেট করা হয়েছে।`,
                    read: false,
                    metadata: {
                        instituteName: institute.name,
                        instituteAddress: institute.address || 'ঠিকানা নেই',
                        instituteLogo: institute.logo || null,
                        permissionDetails: permissionDetails.length > 0 ? permissionDetails : ['কোনো অনুমতি দেওয়া হয়নি']
                    }
                }
            });

        } catch (notifError) {
            console.error('Failed to send notification:', notifError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json(updatedProfile);
    } catch (error) {
        console.error('Update Permissions Error:', error);
        return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
    }
}
