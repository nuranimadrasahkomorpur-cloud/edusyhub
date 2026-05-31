import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { descriptor } = await req.json();

        if (!descriptor || !Array.isArray(descriptor)) {
            return NextResponse.json({ error: 'Invalid face descriptor' }, { status: 400 });
        }

        // Save descriptor to user using raw MongoDB command to bypass Prisma schema validation issues
        await (prisma as any).$runCommandRaw({
            update: 'User',
            updates: [
                {
                    q: { _id: { $oid: id } },
                    u: { 
                        $set: { 
                            faceDescriptor: descriptor,
                            "metadata.hasFaceId": true
                        } 
                    }
                }
            ]
        });

        return NextResponse.json({ success: true, message: 'Face descriptor saved' });
    } catch (error: any) {
        console.error('Error saving face descriptor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
