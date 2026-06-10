import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const teachersRaw = await (prisma as any).$runCommandRaw({
            find: 'User',
            filter: { role: 'TEACHER' }
        });

        const teachers = teachersRaw.cursor?.firstBatch || [];
        const fixed: string[] = [];

        for (const teacher of teachers) {
            const userId = teacher._id.$oid;
            const instituteId = teacher.instituteIds?.[0]?.$oid;

            if (userId && instituteId) {
                const existingRaw = await (prisma as any).$runCommandRaw({
                    find: 'TeacherProfile',
                    filter: { userId: { $oid: userId }, instituteId: { $oid: instituteId } }
                });

                if (!existingRaw.cursor?.firstBatch?.length) {
                    await (prisma as any).$runCommandRaw({
                        insert: 'TeacherProfile',
                        documents: [
                            {
                                userId: { $oid: userId },
                                instituteId: { $oid: instituteId },
                                status: 'ACTIVE',
                                permissions: {},
                                assignedClassIds: [],
                                createdAt: { $date: new Date().toISOString() },
                                updatedAt: { $date: new Date().toISOString() }
                            }
                        ]
                    });
                    fixed.push(teacher.name || userId);
                }
            }
        }

        const result = { success: true, fixed, teachersCount: teachers.length, raw: teachers };
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(process.cwd(), 'fix_debug.json'), JSON.stringify(result, null, 2));

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
