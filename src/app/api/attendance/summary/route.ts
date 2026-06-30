import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const classId = searchParams.get('classId');
        const startDate = searchParams.get('startDate'); // e.g., '2023-01-01'
        const endDate = searchParams.get('endDate');     // e.g., '2023-12-31'

        if (!instituteId) {
            return NextResponse.json({ error: 'Missing instituteId' }, { status: 400 });
        }

        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const filter: any = { instituteId: { $oid: instituteId } };
        if (startDate && endDate) {
            filter.dateString = { $gte: startDate, $lte: endDate };
        }

        let isOwner = false;
        if (instituteId) {
            const inst = await prisma.institute.findUnique({
                where: { id: instituteId },
                select: { adminIds: true }
            });
            if (inst && inst.adminIds) {
                isOwner = inst.adminIds.some((id: any) => {
                    if (!id) return false;
                    const idStr = typeof id === 'string' ? id : (id.$oid || id.toString());
                    return idStr === session.user.id.toString();
                });
            }
        }

        if (!isOwner) {
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
                    return NextResponse.json({
                        summary: { present: 0, absent: 0, late: 0, leave: 0, totalCount: 0 },
                        dailyTrends: [],
                        classBreakdown: []
                    });
                }

                if (classId && classId !== 'all' && classId !== '') {
                    if (!assignedClassIds.includes(classId)) {
                        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                    }
                    filter.classId = { $oid: classId };
                } else {
                    filter.classId = { $in: assignedClassIds.map(id => ({ $oid: id })) };
                }
            } else {
                if (classId && classId !== 'all' && classId !== '') {
                    filter.classId = { $oid: classId };
                }
            }
        } else {
            if (classId && classId !== 'all' && classId !== '') {
                filter.classId = { $oid: classId };
            }
        }

        // 1. Overall Attendance Stats
        const statsResult = await (prisma as any).$runCommandRaw({
            aggregate: 'Attendance',
            pipeline: [
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalCount: { $sum: 1 },
                        present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
                        absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
                        late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
                        leave: { $sum: { $cond: [{ $in: ['$status', ['LEAVE', 'LEAVE_PENDING']] }, 1, 0] } }
                    }
                }
            ],
            cursor: {}
        });

        // 2. Daily Trends
        const dailyResult = await (prisma as any).$runCommandRaw({
            aggregate: 'Attendance',
            pipeline: [
                { $match: filter },
                {
                    $group: {
                        _id: '$dateString',
                        present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
                        absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
                        late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
                        leave: { $sum: { $cond: [{ $in: ['$status', ['LEAVE', 'LEAVE_PENDING']] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ],
            cursor: {}
        });

        // 3. Count total active students to calculate missing (unmarked) attendance
        const studentQuery: any = {
            role: 'STUDENT',
            instituteIds: { $oid: instituteId },
            'metadata.status': { $ne: 'INACTIVE' },
            'metadata.admissionStatus': { $ne: 'PENDING' }
        };
        if (classId && classId !== 'all' && classId !== '') {
            studentQuery['metadata.classId'] = classId;
        }

        const studentCountResult = await (prisma as any).$runCommandRaw({
            count: 'User',
            query: studentQuery
        });
        const totalStudents = studentCountResult.n || 0;

        // 4. Class breakdown (if not filtering by specific class)
        const classBreakdown: any[] = [];
        if (!classId || classId === 'all' || classId === '') {
            const classResult = await (prisma as any).$runCommandRaw({
                aggregate: 'Attendance',
                pipeline: [
                    { $match: filter },
                    {
                        $group: {
                            _id: '$classId',
                            total: { $sum: 1 },
                            present: { $sum: { $cond: [{ $in: ['$status', ['PRESENT', 'LATE']] }, 1, 0] } }
                        }
                    }
                ],
                cursor: {}
            });

            const rawClasses = classResult.cursor?.firstBatch || [];

            // Get class names
            const classesFound = await prisma.class.findMany({
                where: { instituteId },
                select: { id: true, name: true }
            });
            const classNameMap = new Map(classesFound.map(c => [c.id, c.name]));

            // Need class-specific student count to adjust breakdown
            const studentsPerClassResult = await (prisma as any).$runCommandRaw({
                aggregate: 'User',
                pipeline: [
                    { $match: { role: 'STUDENT', instituteIds: { $oid: instituteId }, 'metadata.status': { $ne: 'INACTIVE' }, 'metadata.admissionStatus': { $ne: 'PENDING' } } },
                    { $group: { _id: '$metadata.classId', count: { $sum: 1 } } }
                ],
                cursor: {}
            });
            const classStudentCounts = new Map<string, number>((studentsPerClassResult.cursor?.firstBatch || []).map((c: any) => [String(c._id), Number(c.count)]));

            rawClasses.forEach((item: any) => {
                const cid = item._id?.$oid || String(item._id);
                // The total working days for this class can be approximated by (total / current_student_count) 
                // but since total is just marked attendance, let's just use the max working days from overall trends
                const workingDays = dailyResult.cursor?.firstBatch.length || 0;
                const studentCount = classStudentCounts.get(cid) || 0;
                const trueClassTotal = workingDays * studentCount;
                // if we don't know the exact working days per class, we use the global working days.
                // To avoid 0 division or >100% rate:
                const safeTotal = trueClassTotal > item.present ? trueClassTotal : item.total;
                
                classBreakdown.push({
                    className: classNameMap.get(cid) || 'Unknown',
                    rate: safeTotal > 0 ? Math.round((item.present / safeTotal) * 100) : 0
                });
            });
        }

        const summary = statsResult.cursor?.firstBatch[0] || { present: 0, absent: 0, late: 0, leave: 0, totalCount: 0 };
        const workingDays = dailyResult.cursor?.firstBatch.length || 0;
        const expectedTotalRecords = workingDays * totalStudents;

        const dailyTrends = (dailyResult.cursor?.firstBatch || []).map((d: any) => {
            return {
                date: d._id,
                present: d.present,
                absent: d.absent,
                late: d.late,
                leave: d.leave
            };
        });

        return NextResponse.json({
            summary,
            dailyTrends,
            classBreakdown
        });

    } catch (error: any) {
        console.error('Error fetching attendance summary:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
