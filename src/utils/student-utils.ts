import prisma from './db';

/**
 * Helper to get the maximum numeric value of a metadata field.
 */
async function getMaxMetadataValue(instituteId: string, filterExtras: any, fieldName: string): Promise<number> {
    // Try to match both string and ObjectId for flexibility
    const filter: any = {
        role: 'STUDENT',
        $or: [
            { instituteIds: instituteId },
            { instituteIds: { $oid: instituteId } }
        ],
        [`metadata.${fieldName}`]: { $exists: true, $ne: "" }
    };

    // Integrate filterExtras (like classId) into the or/match logic
    if (filterExtras['metadata.classId']) {
        const classId = filterExtras['metadata.classId'];
        filter.$and = [
            {
                $or: [
                    { 'metadata.classId': classId },
                    { 'metadata.classId': { $oid: classId } }
                ]
            }
        ];
    }

    try {
        const result = await (prisma as any).$runCommandRaw({
            aggregate: 'User',
            pipeline: [
                { $match: filter },
                {
                    $project: {
                        numericVal: {
                            $convert: {
                                input: `$metadata.${fieldName}`,
                                to: "int",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        maxVal: { $max: "$numericVal" }
                    }
                }
            ],
            cursor: {}
        });

        return result.cursor?.firstBatch?.[0]?.maxVal || 0;
    } catch (error) {
        console.error(`Error in getMaxMetadataValue for field ${fieldName}:`, error);
        // Fallback or rethrow? For now, rethrow so it's caught by the API route and logged there
        throw error;
    }
}

export async function getNextStudentId(instituteId: string): Promise<string> {
    let result = await (prisma as any).$runCommandRaw({
        findAndModify: 'Counter',
        query: { _id: `${instituteId}_studentId` },
        update: { $inc: { seq: 1 } },
        new: true
    });

    if (result?.value?.seq) {
        return result.value.seq.toString();
    }

    const maxId = await getMaxMetadataValue(instituteId, {}, 'studentId');
    const startValue = maxId < 100 ? 101 : maxId + 1;

    result = await (prisma as any).$runCommandRaw({
        findAndModify: 'Counter',
        query: { _id: `${instituteId}_studentId` },
        update: { 
            $setOnInsert: { seq: startValue } 
        },
        new: true,
        upsert: true
    });

    if (result?.lastErrorObject?.updatedExisting === false) {
        return startValue.toString();
    } else {
        result = await (prisma as any).$runCommandRaw({
            findAndModify: 'Counter',
            query: { _id: `${instituteId}_studentId` },
            update: { $inc: { seq: 1 } },
            new: true
        });
        return result.value.seq.toString();
    }
}

/**
 * Calculates the next available Roll Number for a class within an institute.
 * Returns a string representing the number (e.g., "01", "S-01").
 */
export async function getNextRollNumber(instituteId: string, classId: string, groupId?: string | null): Promise<string> {
    if (!classId) return "01";

    let counterId = `${instituteId}_${classId}_rollNumber`;
    let prefix = "";

    if (groupId && groupId !== 'all') {
        counterId = `${instituteId}_${classId}_${groupId}_rollNumber`;
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (group && group.name) {
            // Find first english character or default to first char
            const englishMatch = group.name.match(/[a-zA-Z]/);
            if (englishMatch) {
                prefix = englishMatch[0].toUpperCase() + "-";
            } else {
                prefix = group.name.charAt(0) + "-";
            }
        }
    }

    let result = await (prisma as any).$runCommandRaw({
        findAndModify: 'Counter',
        query: { _id: counterId },
        update: { $inc: { seq: 1 } },
        new: true
    });

    let seqVal = 0;
    if (result?.value?.seq) {
        seqVal = result.value.seq;
    } else {
        // Fallback: try to get max if no counter exists
        let maxRoll = 0;
        try {
            maxRoll = await getMaxMetadataValue(instituteId, { 'metadata.classId': classId }, 'rollNumber');
        } catch(e) {}
        
        const startValue = maxRoll + 1;

        result = await (prisma as any).$runCommandRaw({
            findAndModify: 'Counter',
            query: { _id: counterId },
            update: { 
                $setOnInsert: { seq: startValue } 
            },
            new: true,
            upsert: true
        });

        if (result?.lastErrorObject?.updatedExisting === false) {
            seqVal = startValue;
        } else {
            result = await (prisma as any).$runCommandRaw({
                findAndModify: 'Counter',
                query: { _id: counterId },
                update: { $inc: { seq: 1 } },
                new: true
            });
            seqVal = result.value.seq;
        }
    }

    return prefix + seqVal.toString().padStart(2, '0');
}
