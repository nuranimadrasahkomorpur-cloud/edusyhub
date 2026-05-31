import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function POST(req: NextRequest) {
    try {
        const { studentId, dateString, instituteId: bodyInstituteId } = await req.json();

        if (!studentId || !dateString) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { instituteIds: true, metadata: true }
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const targetInstituteId = bodyInstituteId || (() => {
            const common = (student.instituteIds || []).filter(id => 
                (session.user.instituteIds || []).includes(id.toString())
            );
            return common[0]?.toString();
        })();

        if (!targetInstituteId) {
            return NextResponse.json({ error: 'Institute ID not resolved' }, { status: 400 });
        }

        let isOwner = false;
        const inst = await prisma.institute.findUnique({
            where: { id: targetInstituteId },
            select: { adminIds: true }
        });
        if (inst && inst.adminIds) {
            isOwner = inst.adminIds.some((id: any) => {
                if (!id) return false;
                const idStr = typeof id === 'string' ? id : (id.$oid || id.toString());
                return idStr === session.user.id.toString();
            });
        }

        if (!isOwner) {
            const profile = await prisma.teacherProfile.findUnique({
                where: {
                    userId_instituteId: {
                        userId: session.user.id,
                        instituteId: targetInstituteId
                    }
                }
            });

            if (!profile || profile.status !== 'ACTIVE') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!profile.isAdmin) {
                const finalClassId = (student.metadata as any)?.classId;
                if (!finalClassId) {
                    return NextResponse.json({ error: 'Class ID not found' }, { status: 400 });
                }

                const assignedClassIds = (profile.assignedClassIds || []).map(id => id.toString());
                if (!assignedClassIds.includes(finalClassId.toString())) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }

                const classPermissions = (profile.permissions as any)?.classWise?.[finalClassId];
                let hasPerm = false;
                if (classPermissions) {
                    if (typeof classPermissions === 'object' && classPermissions.permissions && Array.isArray(classPermissions.permissions)) {
                        hasPerm = classPermissions.permissions.includes('canTakeAttendance');
                    } else if (Array.isArray(classPermissions)) {
                        hasPerm = classPermissions.includes('canTakeAttendance');
                    } else if (typeof classPermissions === 'object') {
                        hasPerm = classPermissions.canTakeAttendance === true;
                    } else if (typeof classPermissions === 'string') {
                        hasPerm = classPermissions === 'canTakeAttendance';
                    }
                }
                if (!hasPerm) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            }
        }

        // Helper to validate and format MongoDB ObjectId
        const toOid = (id: string) => {
            if (/^[0-9a-fA-F]{24}$/.test(id)) {
                return { $oid: id };
            }
            return id;
        };

        const filter = {
            studentId: toOid(studentId),
            dateString
        };

        console.log('Unmarking attendance with filter:', JSON.stringify(filter));

        // Use raw MongoDB command to delete the document
        try {
            await (prisma as any).$runCommandRaw({
                delete: 'Attendance',
                deletes: [
                    {
                        q: filter,
                        limit: 1
                    }
                ]
            });
        } catch (rawError: any) {
            console.error('Raw MongoDB delete (Attendance) failed:', rawError);

            // Fallback: Try lowercase collection name
            try {
                await (prisma as any).$runCommandRaw({
                    delete: 'attendance',
                    deletes: [
                        {
                            q: filter,
                            limit: 1
                        }
                    ]
                });
            } catch (secondError: any) {
                console.error('Fallback delete (attendance) also failed:', secondError);
                throw rawError;
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('CRITICAL: Error unmarking attendance:', error);
        return NextResponse.json({
            error: error.message,
            name: error.name,
            code: error.code
        }, { status: 500 });
    }
}
