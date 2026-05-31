import { cookies } from 'next/headers';
import prisma from './db';

export async function getServerSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('edusy_auth_token')?.value;

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
