import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const instituteId = searchParams.get('instituteId');
        const userId = searchParams.get('userId');

        const where: any = {};
        if (category && category !== 'সকল বিষয়') where.category = category;
        if (status) where.status = status;
        if (instituteId) where.instituteId = instituteId;
        if (userId) where.userId = userId;

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { problemToSolve: { contains: search, mode: 'insensitive' } },
                { authorName: { contains: search, mode: 'insensitive' } },
                { humanId: { contains: search, mode: 'insensitive' } }
            ];
        }

        // @ts-ignore
        const topics = await (prisma as any).researchTopic.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, data: topics });
    } catch (error: any) {
        console.error('Error fetching research topics from DB:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            title,
            problemToSolve,
            category,
            researchType = 'Writing Improvement',
            status = 'Running',
            visibility = 'public',
            bookInfo,
            totalDays = 7,
            currentDayNumber = 1,
            progress = 0,
            days = [],
            sources = [],
            evidenceList = [],
            finalReport,
            authorId,
            authorName = 'শিক্ষক গবেষক',
            authorRole = 'শিক্ষক',
            instituteName = 'এডুসি নেটওয়ার্ক',
            instituteId,
            userId,
            tags = [],
            fieldTestedCount = 1,
            completedCount = 0,
            improvedVersionCount = 0,
            contributors = []
        } = body;

        // Support saving drafts gracefully before full submission
        const isDraft = status === 'Draft';
        const effectiveTitle = (title && title.trim()) || (isDraft ? 'নামহীন খসড়া গবেষণা' : '');
        const effectiveProblem = (problemToSolve && problemToSolve.trim()) || (isDraft ? 'খসড়া উদ্দেশ্য এখনও লিপিবদ্ধ করা হয়নি।' : '');

        if (!effectiveTitle && !isDraft) {
            return NextResponse.json(
                { success: false, message: 'Title is required.' },
                { status: 400 }
            );
        }

        // If client passed a humanId and topic already exists, update it rather than failing with unique constraint error
        if (body.humanId) {
            // @ts-ignore
            const existingTopic = await (prisma as any).researchTopic.findUnique({
                where: { humanId: body.humanId }
            }).catch(() => null);

            if (existingTopic) {
                // @ts-ignore
                const updatedTopic = await (prisma as any).researchTopic.update({
                    where: { id: existingTopic.id },
                    data: {
                        title: effectiveTitle,
                        problemToSolve: effectiveProblem,
                        category: category || existingTopic.category,
                        researchType: researchType || existingTopic.researchType,
                        status: status || existingTopic.status,
                        visibility: visibility || existingTopic.visibility,
                        bookInfo: bookInfo !== undefined ? bookInfo : existingTopic.bookInfo,
                        totalDays: Number(totalDays) || existingTopic.totalDays,
                        currentDayNumber: Number(currentDayNumber) || existingTopic.currentDayNumber,
                        progress: Number(progress) || existingTopic.progress,
                        days: days && days.length > 0 ? days : existingTopic.days,
                        sources: sources && sources.length > 0 ? sources : existingTopic.sources,
                        evidenceList: evidenceList && evidenceList.length > 0 ? evidenceList : existingTopic.evidenceList,
                        tags: tags || existingTopic.tags,
                        authorName: authorName || existingTopic.authorName,
                        authorRole: authorRole || existingTopic.authorRole,
                        instituteName: instituteName || existingTopic.instituteName
                    }
                });
                return NextResponse.json({ success: true, data: updatedTopic });
            }
        }

        // Generate guaranteed collision-free unique humanId
        const currentYear = new Date().getFullYear();
        let humanId = body.humanId;

        if (!humanId) {
            // @ts-ignore
            const count = await (prisma as any).researchTopic.count().catch(() => 0);
            let seq = count + 1;
            let candidate = `TOP-${currentYear}-${String(seq).padStart(4, '0')}`;
            let isUnique = false;

            for (let i = 0; i < 25; i++) {
                // @ts-ignore
                const exists = await (prisma as any).researchTopic.findUnique({
                    where: { humanId: candidate }
                }).catch(() => null);

                if (!exists) {
                    isUnique = true;
                    humanId = candidate;
                    break;
                }
                seq++;
                candidate = `TOP-${currentYear}-${String(seq).padStart(4, '0')}`;
            }

            if (!isUnique) {
                humanId = `TOP-${currentYear}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
            }
        }

        // Ensure days have human IDs
        const processedDays = (days || []).map((d: any, idx: number) => ({
            ...d,
            humanId: d.humanId || `ACT-${currentYear}-${String(idx + 1).padStart(2, '0')}${humanId.slice(-4)}`
        }));

        let newTopic;
        const topicData = {
            humanId,
            title: effectiveTitle,
            problemToSolve: effectiveProblem,
            category: category || 'বাংলা',
            researchType,
            status,
            visibility,
            bookInfo: bookInfo || null,
            totalDays: Number(totalDays) || 7,
            currentDayNumber: Number(currentDayNumber) || 1,
            progress: Number(progress) || 0,
            days: processedDays,
            sources: sources || [],
            evidenceList: evidenceList || [],
            finalReport: finalReport || null,
            authorId: authorId || userId || null,
            authorName,
            authorRole,
            instituteName,
            tags: tags || [],
            fieldTestedCount: Number(fieldTestedCount) || 1,
            completedCount: Number(completedCount) || 0,
            improvedVersionCount: Number(improvedVersionCount) || 0,
            contributors: contributors || [],
            ...(userId && { user: { connect: { id: userId } } }),
            ...(instituteId && { institute: { connect: { id: instituteId } } })
        };

        try {
            // @ts-ignore
            newTopic = await (prisma as any).researchTopic.create({
                data: topicData
            });
        } catch (createErr: any) {
            if (createErr.code === 'P2002') {
                // Unique constraint race condition retry with timestamp ID
                const fallbackHumanId = `TOP-${currentYear}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
                // @ts-ignore
                newTopic = await (prisma as any).researchTopic.create({
                    data: {
                        ...topicData,
                        humanId: fallbackHumanId
                    }
                });
            } else {
                throw createErr;
            }
        }

        return NextResponse.json({ success: true, data: newTopic });
    } catch (error: any) {
        console.error('Error creating research topic in DB:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
