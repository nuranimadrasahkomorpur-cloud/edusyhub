import { NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        if (!instituteId) {
            return NextResponse.json({ message: 'instituteId required' }, { status: 400 });
        }

        const allCategories = await (prisma as any).accountCategory.findMany({
            where: { instituteId },
            select: { name: true, config: true }
        });
        const archivedCategories = allCategories.filter((c: any) => c.config?.isArchived === true);
        const archivedCategoryNames = archivedCategories.map((c: any) => c.name);
        const archivedCategoryIds = archivedCategories.map((c: any) => c.id).filter(Boolean);

        const matchStage = {
            instituteId: { $oid: instituteId },
            type: 'INCOME',
            studentId: { $ne: null }
        };

        const result = await (prisma as any).$runCommandRaw({
            aggregate: 'Transaction',
            pipeline: [
                { $match: matchStage },
                {
                    $group: {
                        _id: "$studentId",
                        totalPaid: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "COMPLETED"] },
                                            { $ne: ["$isExcludedFromSummary", true] },
                                            { $not: { $regexMatch: { input: { $ifNull: ["$category", ""] }, regex: "^__ADVANCE__" } } }
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        },
                        advance: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "COMPLETED"] },
                                            { $regexMatch: { input: { $ifNull: ["$category", ""] }, regex: "^__ADVANCE__" } }
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        },
                        totalDue: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "PENDING"] },
                                            { $ne: ["$isExcludedFromSummary", true] },
                                            { $ne: ["$isArchived", true] },
                                            { $not: { $in: [{ $ifNull: ["$categoryId", ""] }, archivedCategoryIds] } },
                                            { $not: { $in: [{ $ifNull: ["$category", ""] }, archivedCategoryNames] } }
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        }
                    }
                }
            ],
            cursor: {}
        });

        const feesMap: Record<string, { totalPaid: number, totalDue: number, advance: number }> = {};
        
        const docs = result.cursor?.firstBatch || [];
        for (const doc of docs) {
            const studentId = doc._id?.$oid || doc._id?.toString() || doc._id;
            if (!studentId) continue;
            feesMap[studentId] = {
                totalPaid: doc.totalPaid || 0,
                totalDue: doc.totalDue || 0,
                advance: doc.advance || 0
            };
        }

        return NextResponse.json(feesMap);
    } catch (error: any) {
        console.error('Failed to get dues summary:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
