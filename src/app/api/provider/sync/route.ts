import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ success: false, message: "Institute ID is required" }, { status: 400 });
        }

        // Fetch Institute
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId }
        });

        if (!institute) {
            return NextResponse.json({ success: false, message: "Institute not found" }, { status: 404 });
        }

        // Fetch Classes
        const classes = await prisma.class.findMany({
            where: { instituteId },
            include: { groups: true }
        });

        // Fetch Students
        const students = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                instituteIds: { has: instituteId }
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                metadata: true,
                createdAt: true,
            }
        });

        // Fetch Books
        const books = await prisma.book.findMany({
            where: { instituteId }
        });

        return NextResponse.json({
            success: true,
            data: {
                institute,
                classes,
                students,
                books
            }
        });

    } catch (error: any) {
        console.error("Provider Sync API Error:", error);
        return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
