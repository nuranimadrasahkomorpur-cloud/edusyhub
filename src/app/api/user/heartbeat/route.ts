import { NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Heartbeat just acknowledges the session is active
        return NextResponse.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            userId: session.user.id 
        });
    } catch (error: any) {
        return NextResponse.json({ message: 'Error', error: error.message }, { status: 500 });
    }
}
