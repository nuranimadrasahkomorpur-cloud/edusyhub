import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, name, email, phone, password } = body;

        if (!id) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (password) {
            updateData.password = password;
            const currentUser = await prisma.user.findUnique({
                where: { id },
                select: { metadata: true }
            });
            const currentMetadata = (currentUser?.metadata as any) || {};
            updateData.metadata = {
                ...currentMetadata,
                originalPassword: password
            };
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        // Omit password from response
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error('Update Profile Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
