import { cookies, headers } from 'next/headers';
import prisma from './db';

export async function getServerSession(req?: Request) {
    let token: string | undefined;

    try {
        const cookieStore = await cookies();
        token = cookieStore.get('edusy_auth_token')?.value;
    } catch {
        // cookies() might fail in some contexts
    }

    if (!token) {
        try {
            const headerList = await headers();
            const authHeader = headerList.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7).trim();
            } else if (headerList.get('x-user-id')) {
                token = headerList.get('x-user-id')?.trim();
            }
        } catch {
            // headers() might fail in some contexts
        }
    }

    if (!token && req) {
        try {
            const url = new URL(req.url);
            const queryUserId = url.searchParams.get('userId');
            if (queryUserId) token = queryUserId.trim();
        } catch {
            // URL parse error
        }
    }

    if (!token) return null;

    // Sanitize token (remove quotes or extra spaces if any)
    const sanitizedToken = token.replace(/['"]+/g, '').trim();

    try {
        // MongoDB ObjectIDs must be 24-char hex
        if (sanitizedToken.length !== 24) return null;

        const user = await prisma.user.findUnique({
            where: { id: sanitizedToken },
            select: {
                id: true,
                email: true,
                role: true,
                instituteIds: true,
                name: true,
                teacherProfiles: {
                    select: {
                        id: true,
                        instituteId: true,
                        status: true,
                        isAdmin: true,
                        permissions: true,
                        assignedClassIds: true
                    }
                }
            }
        });
        
        if (!user) return null;

        return {
            user: {
                ...user,
                id: user.id
            }
        };
    } catch (error: any) {
        console.error('❌ [AUTH ERROR] Session validation failed:', error);
        return null;
    }
}
