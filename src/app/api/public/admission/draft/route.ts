import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
export async function POST(req: Request) {
    try {
        const { instituteId } = await req.json();

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const currentYear = new Date().getFullYear();

        // 1. Atomically increment the sequence
        const sequence = await prisma.formSequence.upsert({
            where: {
                instituteId_year: {
                    instituteId,
                    year: currentYear
                }
            },
            update: {
                nextNumber: { increment: 1 }
            },
            create: {
                instituteId,
                year: currentYear,
                nextNumber: 2 // If it didn't exist, we just assigned 1, so next is 2
            }
        });

        // The assigned number is either the incremented one, or 1 if it was just created
        // Note: Prisma's upsert returns the UPDATED record. 
        // If created, nextNumber is 2, so our assigned number is 1.
        // If updated from 2 to 3, nextNumber is 3, so our assigned number is 3-1 = 2? 
        // Actually, upsert `update: { increment: 1 }` returns the NEW value (e.g., 3).
        // So the assigned number should be `sequence.nextNumber - 1`.
        const assignedNumber = sequence.nextNumber - 1;

        // Format as YYYY-XXXX
        const formNumber = `${currentYear}-${String(assignedNumber).padStart(4, '0')}`;

        // 2. Create the Admission Draft
        const draft = await prisma.admissionDraft.create({
            data: {
                instituteId,
                formNumber,
                status: 'DRAFT'
            }
        });

        return NextResponse.json({
            draftId: draft.id,
            formNumber: draft.formNumber
        });

    } catch (error) {
        console.error('Error creating admission draft:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
