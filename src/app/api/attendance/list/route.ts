import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get('classId');
        const instituteId = searchParams.get('instituteId');
        const dateString = searchParams.get('date');
        const month = searchParams.get('month'); // e.g. "2026-05" for full-month register view

        if ((!classId && !instituteId) || (!dateString && !month)) {
            return NextResponse.json({ error: 'Missing classId/instituteId or date/month' }, { status: 400 });
        }

        const session = await getServerSession();
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
        const isTeacher = baseRole === 'TEACHER' || (teacherProfiles && (teacherProfiles || []).some((p: any) => p.instituteId === instituteId));

        if (isTeacher && instituteId) {
            const profile = await prisma.teacherProfile.findUnique({
                where: {
                    userId_instituteId: {
                        userId: session.user.id,
                        instituteId: instituteId
                    }
                }
            });

            if (!profile || profile.status !== 'ACTIVE') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!profile.isAdmin) {
                const assignedClassIds = (profile.assignedClassIds || []).map(id => id.toString());
                if (assignedClassIds.length === 0) {
                    return NextResponse.json([]); // Return empty list, no classes assigned
                }

                if (classId && classId !== 'all' && classId !== '') {
                    if (!assignedClassIds.includes(classId)) {
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
