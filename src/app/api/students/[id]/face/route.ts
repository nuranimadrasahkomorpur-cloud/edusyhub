import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { descriptor, middleImageBase64, action } = await req.json();

        if (!descriptor || !Array.isArray(descriptor)) {
            return NextResponse.json({ error: 'Invalid face descriptor' }, { status: 400 });
        }

        // Fetch user to check if metadata.photo is empty
        const user = await prisma.user.findUnique({
            where: { id },
            select: { metadata: true, faceDescriptor: true }
        });

        // Backend Duplicate Check
        const allStudents = await prisma.user.findMany({
            where: { role: 'STUDENT', id: { not: id } },
            select: { id: true, name: true, faceDescriptor: true }
        });
        
        let primaryDesc: any = null;
        if (action === 'append') {
             primaryDesc = descriptor;
        } else {
             primaryDesc = Array.isArray(descriptor[0]) ? descriptor[0] : descriptor;
        }
        
        const inputDescriptor = new Float32Array(primaryDesc);
        const THRESHOLD = 0.38;

        for (const student of allStudents) {
            const faceDesc: any = student.faceDescriptor;
            if (!faceDesc || faceDesc.length === 0) continue;
            
            let descriptorsToCheck: number[][] = [];
            if (Array.isArray(faceDesc[0])) {
                descriptorsToCheck = faceDesc;
            } else {
                descriptorsToCheck = [faceDesc];
            }

            for (const desc of descriptorsToCheck) {
                const studentDescriptor = new Float32Array(desc);
                let sum = 0;
                for (let i = 0; i < 128; i++) {
                    const diff = inputDescriptor[i] - studentDescriptor[i];
                    sum += diff * diff;
                }
                const distance = Math.sqrt(sum);

                if (distance < THRESHOLD) {
                    return NextResponse.json({ 
                        error: `এই মুখটি ইতিপূর্বে ${student.name} নামে নিবন্ধিত হয়েছে।` 
                    }, { status: 400 });
                }
            }
        }
        
        let finalDescriptor: any = descriptor;
        
        if (action === 'append') {
            let existing: any[] = [];
            if (user?.faceDescriptor) {
                if (Array.isArray(user.faceDescriptor) && user.faceDescriptor.length > 0) {
                    if (Array.isArray(user.faceDescriptor[0])) {
                        existing = [...user.faceDescriptor];
                    } else {
                        existing = [user.faceDescriptor];
                    }
                }
            }
            existing.push(descriptor);
            
            // Limit to max 5 descriptors to save DB space
            if (existing.length > 5) {
                existing = [existing[0], ...existing.slice(-4)];
            }
            finalDescriptor = existing;
        }

        let updateData: any = { 
            faceDescriptor: finalDescriptor,
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

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const index = searchParams.get('index');

        const user = await prisma.user.findUnique({
            where: { id },
            select: { metadata: true, faceDescriptor: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let updateData: any = {};

        if (index !== null) {
            // Delete specific descriptor
            let existing: any[] = [];
            if (user.faceDescriptor && Array.isArray(user.faceDescriptor)) {
                if (user.faceDescriptor.length > 0 && Array.isArray(user.faceDescriptor[0])) {
                    existing = [...user.faceDescriptor];
                } else {
                    existing = [user.faceDescriptor];
                }
            }
            
            const idx = parseInt(index);
            if (idx >= 0 && idx < existing.length) {
                existing.splice(idx, 1);
            }

            if (existing.length === 0) {
                updateData = { 
                    faceDescriptor: [],
                    "metadata.hasFaceId": false
                };
            } else {
                updateData = { faceDescriptor: existing };
            }
        } else {
            // Delete all face data
            updateData = { 
                faceDescriptor: [],
                "metadata.hasFaceId": false,
                "metadata.photo": null
            };
        }

        await (prisma as any).$runCommandRaw({
            update: 'User',
            updates: [
                {
                    q: { _id: { $oid: id } },
                    u: { $set: updateData }
                }
            ]
        });

        return NextResponse.json({ success: true, message: 'Face data deleted' });
    } catch (error: any) {
        console.error('Error deleting face descriptor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
