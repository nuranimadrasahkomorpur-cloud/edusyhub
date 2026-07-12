import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        
        if (!id) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const institute = await prisma.institute.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                logo: true,
                coverImage: true,
                address: true,
                type: true,
                phone: true,
                email: true,
                website: true
            }
        });

        if (!institute) {
            return NextResponse.json({ message: 'Institute not found' }, { status: 404 });
        }

        return NextResponse.json(institute);

    } catch (error) {
        console.error('Public Institute API Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
