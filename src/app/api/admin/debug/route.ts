import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(request: Request) {
    try {
        const start = Date.now();
        
        const pipeline: any[] = [
            { $match: { role: 'STUDENT', 'metadata.admissionStatus': { $ne: 'PENDING' } } },
            { $limit: 50 },
            { $project: {
                name: 1,
                'metadata.classId': 1,
                'metadata.studentId': 1
            }}
        ];

        const usersRaw = await (prisma as any).$runCommandRaw({
            aggregate: 'User',
            pipeline,
            cursor: { batchSize: 5000 }
        });

        const timeTaken = Date.now() - start;
        const count = usersRaw.cursor?.firstBatch?.length || 0;

        return NextResponse.json({ 
            success: true, 
            timeTakenMs: timeTaken,
            count,
            firstUserSize: usersRaw.cursor?.firstBatch?.[0] ? JSON.stringify(usersRaw.cursor.firstBatch[0]).length : 0
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
