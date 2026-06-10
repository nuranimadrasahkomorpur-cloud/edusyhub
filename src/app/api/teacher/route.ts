
import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('instituteId');

    if (!instituteId) {
        return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    try {
        // Find all Users who are TEACHERs and belong to this institute
        const rawUsers = await (prisma as any).$runCommandRaw({
            find: 'User',
            filter: { 
                role: 'TEACHER',
                instituteIds: { $oid: instituteId }
            }
        });

        // Also try pure string matching just in case
        const rawUsersString = await (prisma as any).$runCommandRaw({
            find: 'User',
            filter: { 
                role: 'TEACHER',
                instituteIds: instituteId
            }
        });

        let allUsers = [];
        if (rawUsers.cursor?.firstBatch) {
            allUsers.push(...rawUsers.cursor.firstBatch);
        }
        if (rawUsersString.cursor?.firstBatch) {
            allUsers.push(...rawUsersString.cursor.firstBatch);
        }

        // Deduplicate
        const uniqueUsersMap = new Map();
        allUsers.forEach((u: any) => {
            const idStr = u._id.$oid || u._id.toString();
            uniqueUsersMap.set(idStr, u);
        });

        const finalUsers = Array.from(uniqueUsersMap.values());

        const profileMap = new Map();

        if (finalUsers.length > 0) {
            // Now fetch their TeacherProfiles (if any exist)
            const userIdsForProfile = finalUsers.map(u => ({ $oid: u._id.$oid || u._id.toString() }));
            const rawProfiles = await (prisma as any).$runCommandRaw({
                find: 'TeacherProfile',
                filter: { 
                    userId: { $in: userIdsForProfile },
                    $or: [
                        { instituteId: instituteId },
                        { instituteId: { $oid: instituteId } }
                    ]
                }
            });

            if (rawProfiles.cursor?.firstBatch) {
                rawProfiles.cursor.firstBatch.forEach((p: any) => {
                    profileMap.set(p.userId.$oid || p.userId.toString(), p);
                });
            }
        }

        const teachers = finalUsers.map((u: any) => {
            const idStr = u._id.$oid || u._id.toString();
            const profile = profileMap.get(idStr);

            return {
                id: profile?._id?.$oid || profile?._id?.toString() || idStr, // Use profile ID if exists, otherwise fallback to user ID
                instituteId: instituteId,
                userId: idStr,
                status: profile?.status || 'ACTIVE',
                assignedClassIds: profile?.assignedClassIds || [],
                permissions: profile?.permissions || {},
                user: {
                    id: idStr,
                    name: u.name,
                    email: u.email,
                    phone: u.phone
                }
            };
        });

        return NextResponse.json(teachers);
    } catch (error) {
        console.error('Fetch teachers error:', error);
        return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }
}
