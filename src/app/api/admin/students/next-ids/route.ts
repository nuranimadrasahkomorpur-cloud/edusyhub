import { NextResponse } from 'next/server';
import { getNextStudentId, getNextRollNumber } from '@/utils/student-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const classId = searchParams.get('classId');
        const groupId = searchParams.get('groupId');

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const nextId = await getNextStudentId(instituteId);
        const nextRoll = await getNextRollNumber(instituteId, classId || '', groupId);

        return NextResponse.json({
            nextStudentId: nextId,
            nextRollNumber: nextRoll
        });

    } catch (error) {
        console.error('Next IDs API Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
