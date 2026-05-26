import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ message: 'Missing instituteId' }, { status: 400 });
        }

        const subscription = await prisma.subscription.findFirst({
            where: { instituteId, status: 'ACTIVE' },
            include: { package: true }
        });

        return NextResponse.json(subscription || { message: 'No active subscription' });
    } catch (error: any) {
        return NextResponse.json({ message: 'Error', error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { instituteId, packageId } = body;

        if (!instituteId || !packageId) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        const pkg = await prisma.package.findUnique({ where: { id: packageId } });
        if (!pkg) {
            return NextResponse.json({ message: 'Package not found' }, { status: 404 });
        }

        const subscription = await prisma.subscription.create({
            data: {
                instituteId,
                packageId,
                endDate: new Date(Date.now() + pkg.duration * 24 * 60 * 60 * 1000)
            }
        });

        return NextResponse.json(subscription);
    } catch (error: any) {
        return NextResponse.json({ message: 'Error', error: error.message }, { status: 500 });
    }
}
