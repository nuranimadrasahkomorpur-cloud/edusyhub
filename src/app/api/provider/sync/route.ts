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

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { instituteId, type, id } = body;

        if (!instituteId || !type || !id) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        if (type === 'student') {
            await prisma.user.delete({
                where: { id: id }
            });
        } else if (type === 'book') {
            await prisma.book.delete({
                where: { id: id }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Provider Sync DELETE Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { instituteId, type, data } = body;

        if (!instituteId || !type || !data) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        if (type === 'student') {
            // Need to generate random password for new user
            await prisma.user.create({
                data: {
                    id: data.id,
                    name: data.name,
                    phone: data.mobile || data.phone || data.roll || Math.random().toString(),
                    password: "password123", // Default password
                    role: 'STUDENT',
                    instituteIds: [instituteId],
                    defaultInstituteId: instituteId,
                    metadata: data
                }
            });
        } else if (type === 'book') {
            await prisma.book.create({
                data: {
                    id: data.id,
                    name: data.name,
                    instituteId: instituteId,
                    classId: data.className ? data.className : undefined,
                    totalMarks: parseInt(data.totalMarks) || 100
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Provider Sync POST Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { instituteId, type, data } = body;

        if (!instituteId || !type || !data || !data.id) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        if (type === 'student') {
            await prisma.user.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    phone: data.mobile || data.phone || data.roll,
                    metadata: data
                }
            });
        } else if (type === 'book') {
            await prisma.book.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    totalMarks: parseInt(data.totalMarks) || 100
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Provider Sync PUT Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
