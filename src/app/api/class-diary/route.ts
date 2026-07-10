import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        let where: any = {};
        if (instituteId) where.instituteId = instituteId;
        if (id) where.id = id;
        if (userId) where.userId = userId;

        // @ts-ignore - Prisma types might be stale
        const diaries = await prisma.classDiary.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: diaries });
    } catch (error: any) {
        console.error('Error fetching class diaries:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, instituteId, userId, name, startDate, type, config, entries, holidays, teacherLinks, publishTime, logTypes, coverTemplate, targetClass, targetDates, printSettings } = body;

        if (!id && (!instituteId || !userId || !name || !startDate || !type)) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        let diary;
        if (id) {
            // Partial update: only include fields that are explicitly provided
            const updateData: any = {};
            if (instituteId !== undefined) updateData.instituteId = instituteId;
            if (userId !== undefined) updateData.userId = userId;
            if (name !== undefined) updateData.name = name;
            if (startDate !== undefined) updateData.startDate = startDate;
            if (type !== undefined) updateData.type = type;
            if (config !== undefined) updateData.config = config;
            if (entries !== undefined) updateData.entries = entries;
            if (holidays !== undefined) updateData.holidays = holidays;
            if (teacherLinks !== undefined) updateData.teacherLinks = teacherLinks;
            if (publishTime !== undefined) updateData.publishTime = publishTime;
            if (logTypes !== undefined) updateData.logTypes = logTypes;
            if (coverTemplate !== undefined) updateData.coverTemplate = coverTemplate;
            if (targetClass !== undefined) updateData.targetClass = targetClass;
            if (targetDates !== undefined) updateData.targetDates = targetDates;
            if (printSettings !== undefined) updateData.printSettings = printSettings;

            // @ts-ignore
            diary = await prisma.classDiary.update({
                where: { id },
                data: updateData,
            });
        } else {
            const data = {
                instituteId,
                userId,
                name,
                startDate,
                type,
                config: config || {},
                entries: entries || {},
                holidays: holidays || [],
                teacherLinks: teacherLinks || [],
                publishTime,
                logTypes: logTypes || [],
                coverTemplate,
                targetClass: targetClass || [],
                targetDates: targetDates || [],
                printSettings: printSettings || {}
            };
            // @ts-ignore
            diary = await prisma.classDiary.create({
                data,
            });
        }

        return NextResponse.json({ success: true, data: diary });
    } catch (error: any) {
        console.error('Error saving class diary:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
        }

        // @ts-ignore
        await prisma.classDiary.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'Class diary deleted' });
    } catch (error: any) {
        console.error('Error deleting class diary:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
