import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const classId = searchParams.get('classId');

        if (!instituteId) {
            return NextResponse.json({ error: 'Missing instituteId' }, { status: 400 });
        }

        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const filter: any = { instituteId: { $oid: instituteId } };

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
                    return NextResponse.json([]); // Return empty stats list
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

        // Run both aggregations in parallel:
        // 1. Per-student stats
        // 2. Global total unique school days (distinct date strings across all students in scope)
        const [result, globalResult] = await Promise.all([
            (prisma as any).$runCommandRaw({
                aggregate: 'Attendance',
                pipeline: [
                    { $match: filter },
                    {
                        $group: {
                            _id: '$studentId',
                            totalDays: { $sum: 1 },
                            presentDays: {
                                $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] }
                            },
                            lateDays: {
                                $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] }
                            },
                            absentDays: {
                                $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] }
                            }
                        }
                    }
                ],
                cursor: { batchSize: 5000 }
            }),
            (prisma as any).$runCommandRaw({
                aggregate: 'Attendance',
                pipeline: [
                    { $match: filter },
                    // Group by date to count unique school days
                    { $group: { _id: '$dateString' } },
                    { $count: 'totalSchoolDays' }
                ],
                cursor: { batchSize: 100 }
            })
        ]);

        const stats = result.cursor?.firstBatch || [];
        const globalBatch = globalResult.cursor?.firstBatch || [];
        const totalSchoolDays: number = globalBatch[0]?.totalSchoolDays || 0;

        const formattedStats = stats.map((s: any) => ({
            studentId: s._id?.$oid || String(s._id),
            totalDays: s.totalDays,
            presentDays: s.presentDays,
            lateDays: s.lateDays,
            absentDays: s.absentDays,
            // Use the global school-day count as the correct denominator
            totalSchoolDays,
            percentage: totalSchoolDays > 0 ? Math.round(((s.presentDays + s.lateDays) / totalSchoolDays) * 100) : 0
        }));

        return NextResponse.json(formattedStats);
    } catch (error: any) {
        console.error('Error fetching attendance stats:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
