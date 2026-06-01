import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { descriptor, middleImageBase64 } = await req.json();

        if (!descriptor || !Array.isArray(descriptor)) {
            return NextResponse.json({ error: 'Invalid face descriptor' }, { status: 400 });
        }

        // Fetch user to check if metadata.photo is empty
        const user = await prisma.user.findUnique({
            where: { id },
            select: { metadata: true }
        });
        
        let updateData: any = { 
            faceDescriptor: descriptor,
            "metadata.hasFaceId": true
        };

        const metadata = user?.metadata as any;
        if (middleImageBase64 && (!metadata || !metadata.photo)) {
            updateData["metadata.photo"] = middleImageBase64;
        }

        // Save descriptor to user using raw MongoDB command to bypass Prisma schema validation issues
        await (prisma as any).$runCommandRaw({
            update: 'User',
            updates: [
                {
                    q: { _id: { $oid: id } },
                    u: { $set: updateData }
                }
            ]
        });

        return NextResponse.json({ success: true, message: 'Face descriptor saved' });
    } catch (error: any) {
        console.error('Error saving face descriptor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
