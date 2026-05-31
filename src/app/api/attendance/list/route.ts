import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
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

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get('classId');
        let instituteId = searchParams.get('instituteId');
        const dateString = searchParams.get('date');
        const month = searchParams.get('month'); // e.g. "2026-05" for full-month register view

        if ((!classId && !instituteId) || (!dateString && !month)) {
            return NextResponse.json({ error: 'Missing classId/instituteId or date/month' }, { status: 400 });
        }

        if (!instituteId && classId && classId !== 'all' && classId !== '') {
            const cls = await prisma.class.findUnique({
                where: { id: classId },
                select: { instituteId: true }
            });
            if (cls) {
                instituteId = cls.instituteId;
            }
        }

        if (!instituteId) {
            return NextResponse.json({ error: 'Missing or invalid instituteId' }, { status: 400 });
        }

        const session = await getServerSession();
        
        writeDebugLog('GET list request details', {
            classId,
            instituteId,
            dateString,
            month,
            sessionUser: session?.user ? { id: session.user.id, email: session.user.email, role: session.user.role } : null
        });

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Helper to validate and format MongoDB ObjectId
        const toOid = (id: string) => {
            if (/^[0-9a-fA-F]{24}$/.test(id)) {
                return { $oid: id };
            }
            return id;
        };

        // Build native MongoDB filter
        const filter: any = {};

        if (month) {
            // Match all dateStrings starting with the given month prefix e.g. "2026-05"
            filter.dateString = { $regex: `^${month}-` };
        } else {
            filter.dateString = dateString;
        }

        if (instituteId) {
            filter.instituteId = toOid(instituteId);
        }

        const { role: baseRole, teacherProfiles } = session.user as any;
        
        let isOwner = false;
        if (instituteId) {
            const inst = await prisma.institute.findUnique({
                where: { id: instituteId },
                select: { adminIds: true }
            });
            writeDebugLog('GET list: Institute admin check', {
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

        writeDebugLog('GET list: isOwner evaluation', { isOwner });

        if (!isOwner) {
            const profile = await prisma.teacherProfile.findUnique({
                where: {
                    userId_instituteId: {
                        userId: session.user.id,
                        instituteId: instituteId
                    }
                }
            });

            writeDebugLog('GET list: Teacher Profile check for non-owner', {
                profile: profile ? { id: profile.id, userId: profile.userId, instituteId: profile.instituteId, status: profile.status, isAdmin: profile.isAdmin } : null
            });

            if (!profile || profile.status !== 'ACTIVE') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!profile.isAdmin) {
                const assignedClassIds = (profile.assignedClassIds || []).map(id => getCleanId(id));
                if (assignedClassIds.length === 0) {
                    return NextResponse.json([]); // Return empty list, no classes assigned
                }

                if (classId && classId !== 'all' && classId !== '') {
                    if (!assignedClassIds.includes(getCleanId(classId))) {
                        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                    }
                    filter.classId = toOid(classId);
                } else {
                    filter.classId = { $in: assignedClassIds.map(id => toOid(id)) };
                }
            } else {
                if (classId && classId !== 'all' && classId !== '') {
                    filter.classId = toOid(classId);
                }
            }
        } else {
            if (classId && classId !== 'all' && classId !== '') {
                filter.classId = toOid(classId);
            }
        }

        console.log('Fetching attendance with raw filter:', JSON.stringify(filter));

        let result: any;
        try {
            result = await (prisma as any).$runCommandRaw({
                aggregate: 'Attendance',
                pipeline: [
                    { $match: filter }
                ],
                cursor: { batchSize: 10000 }
            });
        } catch (rawError: any) {
            console.error('Raw MongoDB command (Attendance) failed:', rawError);
            try {
                result = await (prisma as any).$runCommandRaw({
                    aggregate: 'attendance',
                    pipeline: [
                        { $match: filter }
                    ],
                    cursor: { batchSize: 10000 }
                });
            } catch (secondError: any) {
                console.error('Fallback raw command (attendance) also failed:', secondError);
                throw rawError;
            }
        }

        const documents = result.cursor?.firstBatch || [];
        console.log(`Found ${documents.length} attendance records.`);

        const normalized = documents.map((doc: any) => ({
            ...doc,
            id: doc._id?.$oid || String(doc._id),
            studentId: doc.studentId?.$oid || String(doc.studentId),
            classId: doc.classId?.$oid || String(doc.classId),
            instituteId: doc.instituteId?.$oid || String(doc.instituteId),
        }));

        return NextResponse.json(normalized);
    } catch (error: any) {
        console.error('CRITICAL: Error fetching attendance list:', error);
        return NextResponse.json({
            error: error.message,
            name: error.name,
            code: error.code,
            meta: error.meta,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
