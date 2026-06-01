import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { sendNotification } from '@/utils/notification-utils';
import { getServerSession } from '@/utils/auth-utils';
import { getCleanId } from '@/utils/digit-utils';
import fs from 'fs';
import path from 'path';

function writeDebugLog(message: string, data: any) {
    try {
        const logDir = 'f:/Edusy User flow/Edusy app/scratch';
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'db_debug.txt');
        const logContent = `[${new Date().toISOString()}] ${message}\n${JSON.stringify(data, null, 2)}\n\n`;
        fs.appendFileSync(logPath, logContent, 'utf-8');
    } catch (e) {
        console.error('Failed to write debug log:', e);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { studentId, instituteId, classId, dateString, status, method, remarks } = await req.json();

        if (!studentId || !instituteId || !dateString) {
            writeDebugLog('Missing required fields', { studentId, instituteId, dateString });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const session = await getServerSession();
        writeDebugLog('Mark request details', {
            studentId,
            instituteId,
            classId,
            dateString,
            status,
            sessionUser: session?.user ? { id: session.user.id, email: session.user.email, role: session.user.role } : null
        });

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let isOwner = false;
        if (instituteId) {
            const inst = await prisma.institute.findUnique({
                where: { id: instituteId },
                select: { adminIds: true }
            });
            writeDebugLog('Institute admin check', {
                inst,
                userId: session.user.id
            });
            if (inst && inst.adminIds) {
                isOwner = inst.adminIds.some((id: any) => {
                    if (!id) return false;
                    const idStr = typeof id === 'string' ? id : (id.$oid || id.toString());
                    return idStr === session.user.id.toString();
                });
            }
        }

        writeDebugLog('isOwner evaluation', { isOwner });

        if (!isOwner) {
            const profile = await prisma.teacherProfile.findUnique({
                where: {
                    userId_instituteId: {
                        userId: session.user.id,
                        instituteId: instituteId
                    }
                }
            });

            writeDebugLog('Teacher Profile check for non-owner', {
                profile: profile ? { id: profile.id, userId: profile.userId, instituteId: profile.instituteId, status: profile.status, isAdmin: profile.isAdmin } : null
            });

            if (!profile || profile.status === 'REJECTED') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!profile.isAdmin) {
                let finalClassId = classId;
                if (!finalClassId || finalClassId === 'all' || finalClassId === '') {
                    const student = await prisma.user.findUnique({
                        where: { id: studentId },
                        select: { metadata: true }
                    });
                    finalClassId = (student?.metadata as any)?.classId;
                }

                if (!finalClassId) {
                    return NextResponse.json({ error: 'Class ID not found' }, { status: 400 });
                }

                const targetClassId = getCleanId(finalClassId);
                const assignedClassIds = (profile.assignedClassIds || []).map(id => getCleanId(id));
                if (!assignedClassIds.includes(targetClassId)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }

                const classPermissions = (profile.permissions as any)?.classWise?.[targetClassId];
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

        // Create update object
        const updateDoc: any = {
            $set: {
                studentId: { $oid: studentId },
                instituteId: { $oid: instituteId },
                dateString,
                status: status || 'PRESENT',
                method: method || 'FRS',
                updatedAt: new Date()
            }
        };

        if (classId) updateDoc.$set.classId = { $oid: classId };
        if (remarks) updateDoc.$set.remarks = remarks;

        // Robust command execution logic
        const runCommand = async (collection: string) => {
            return (prisma as any).$runCommandRaw({
                update: collection,
                updates: [
                    {
                        q: { studentId: { $oid: studentId }, dateString },
                        u: updateDoc,
                        upsert: true
                    }
                ]
            });
        };

        // Upsert attendance using raw MongoDB command
        try {
            await runCommand('Attendance');
        } catch (rawError: any) {
            console.error('Raw MongoDB update (Attendance) failed:', rawError);
            try {
                await runCommand('attendance');
            } catch (secondError: any) {
                console.error('Fallback update (attendance) also failed:', secondError);
                throw rawError;
            }
        }

        // Trigger Guardian Notification for FRS/QR methods if status is PRESENT
        if (status === 'PRESENT' && (method === 'FRS' || method === 'QR')) {
            try {
                // Fetch student and their guardian phone from metadata
                const student = await prisma.user.findUnique({
                    where: { id: studentId },
                    select: {
                        name: true,
                        metadata: true,
                        institutes: {
                            where: { id: instituteId },
                            select: { name: true }
                        }
                    }
                });

                const guardianPhone = (student?.metadata as any)?.guardianPhone;
                if (student && guardianPhone) {
                    // Find guardian user by phone
                    const guardian = await prisma.user.findFirst({
                        where: {
                            phone: guardianPhone,
                            instituteIds: { has: instituteId }
                        }
                    });

                    if (guardian) {
                        const time = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                        const instName = student.institutes?.[0]?.name || 'প্রতিষ্ঠানের নাম পাওয়া যায়নি';

                        await sendNotification({
                            userIds: [guardian.id],
                            type: 'ATTENDANCE_ALERT',
                            instituteId,
                            variables: {
                                studentName: student.name || 'শিক্ষার্থী',
                                time,
                                instituteName: instName
                            },
                            metadata: {
                                studentId,
                                role: 'GUARDIAN'
                            }
                        });
                        console.log(`Notification sent to guardian for ${student.name}`);
                    }
                }
            } catch (notifyError) {
                console.error('Failed to send guardian notification:', notifyError);
            }
        }

        return NextResponse.json({ success: true, message: 'Attendance marked successfully' });
    } catch (error: any) {
        console.error('Error marking attendance:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
