import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

// GET - Fetch notifications for a user
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const notifications = await (prisma as any).notification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { read: false } : {})
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a notification
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, type, title, message, metadata } = body;

        if (!userId || !type || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await (prisma as any).$runCommandRaw({
            insert: 'Notification',
            documents: [{
                userId: { $oid: userId },
                type,
                title,
                message,
                read: false,
                metadata: metadata || null,
                createdAt: { $date: new Date().toISOString() }
            }]
        });

        return NextResponse.json({ success: true, message: 'Notification created' }, { status: 201 });
    } catch (error) {
        console.error('Create Notification Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
