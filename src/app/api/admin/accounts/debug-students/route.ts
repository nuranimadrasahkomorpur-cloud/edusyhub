import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const students = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                instituteIds: { has: 'EDUSY' }
            },
            select: { id: true, name: true, metadata: true }
        });
        
        // Find students 102, 103, 105
        const targetIds = ['102', '103', '105'];
        const targetStudents = students.filter((s: any) => targetIds.includes(s.metadata?.studentId));
        
        // Find 104
        const s104 = students.find((s: any) => s.metadata?.studentId === '104');
        
        // Find all categories
        const categories = await prisma.accountCategory.findMany({
            where: { instituteId: 'EDUSY', isFixed: true }
        });
        
        // Return summary
        return NextResponse.json({
            targets: targetStudents,
            control: s104,
            categories
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
