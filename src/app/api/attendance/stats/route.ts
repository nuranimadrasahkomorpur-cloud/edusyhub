import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const classId = searchParams.get('classId');

        if (!instituteId) {
            return NextResponse.json({ error: 'Missing instituteId' }, { status: 400 });
        }

        const filter: any = { instituteId: { $oid: instituteId } };
        if (classId && classId !== 'all' && classId !== '') {
            filter.classId = { $oid: classId };
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
