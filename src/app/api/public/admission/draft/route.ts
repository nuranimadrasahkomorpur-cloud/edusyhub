import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
export async function POST(req: Request) {
    try {
        const { instituteId } = await req.json();

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const currentYear = new Date().getFullYear();

        // 1. Get exact used form count (total students in this institute)
        const count = await prisma.user.count({
            where: {
                role: 'STUDENT',
                instituteIds: { has: instituteId }
            }
        });
        
        const assignedNumber = count + 1;

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
