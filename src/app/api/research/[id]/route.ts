import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // @ts-ignore
        const topic = await (prisma as any).researchTopic.findFirst({
            where: {
                OR: [
                    { id: id },
                    { humanId: id }
                ]
            }
        });

        if (!topic) {
            return NextResponse.json({ success: false, message: 'Research topic not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: topic });
    } catch (error: any) {
        console.error('Error fetching research topic:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        const updateData: any = {};
        const fields = [
            'title', 'problemToSolve', 'category', 'researchType', 'status', 'visibility',
            'bookInfo', 'totalDays', 'currentDayNumber', 'progress', 'days', 'sources',
            'evidenceList', 'finalReport', 'authorName', 'authorRole', 'instituteName',
            'tags', 'fieldTestedCount', 'completedCount', 'improvedVersionCount', 'contributors'
        ];

        for (const field of fields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        // @ts-ignore
        const updated = await (prisma as any).researchTopic.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Error updating research topic:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // @ts-ignore
        await (prisma as any).researchTopic.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Research topic deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting research topic:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
