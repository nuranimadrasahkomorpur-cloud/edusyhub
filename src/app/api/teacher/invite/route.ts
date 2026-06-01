import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { instituteId, email, phone, name, designation, department, password } = body;

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        // 1. Check if User exists
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { phone: phone }
                ]
            }
        });

        // 2. If not, create User
        if (!user) {
            if (!email || !password || !name) {
                return NextResponse.json({ error: 'New user requires email, name and password' }, { status: 400 });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            user = await prisma.user.create({
                data: {
                    email,
                    phone,
                    name,
                    password: hashedPassword,
                    role: 'TEACHER', // Default role for new teacher accounts
                    instituteIds: [instituteId],
                    defaultInstituteId: instituteId,
                    metadata: {
                        originalPassword: password
                    }
                }
            });
        } else {
            // If user exists, ensure they have the institute in their list
            if (!user.instituteIds.includes(instituteId)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        instituteIds: {
                            push: instituteId
                        }
                    }
                });
            }
        }

        // 3. Create TeacherProfile
        // Check if profile already exists
        const existingProfile = await (prisma as any).teacherProfile.findUnique({
            where: {
                userId_instituteId: {
                    userId: user.id,
                    instituteId: instituteId
                }
            }
        });

        if (existingProfile) {
            return NextResponse.json({ error: 'Teacher profile already exists for this institute' }, { status: 409 });
        }

        const teacherProfile = await (prisma as any).teacherProfile.create({
            data: {
                userId: user.id,
                instituteId,
                status: 'ACTIVE', // Automatically set to ACTIVE so they can start using the system immediately
                permissions: {}, // No permissions initially
                assignedClassIds: [],
            },
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            message: 'Invitation sent successfully',
            teacher: {
                ...teacherProfile,
                user: userWithoutPassword
            }
        });

    } catch (error) {
        console.error('Invite teacher error:', error);
        return NextResponse.json({ error: 'Failed to invite teacher' }, { status: 500 });
    }
}
