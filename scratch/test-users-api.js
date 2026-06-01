const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.time('TeacherQuery');
    
    // Simulate teacher query
    const match = {
        role: 'STUDENT',
        // Simulate institute ID
        // We will just do the same as Teacher query
        $and: [
            {
                $or: [
                    { 'metadata.classId': { $in: ['64b01e35a12f5a0012345678', 'some_other_id'] } },
                    { 'metadata.classId': { $in: [{ $oid: '64b01e35a12f5a0012345678' }] } }
                ]
            },
            {
                $or: [
                    { 'metadata.status': 'ACTIVE' },
                    { 'metadata.status': { $exists: false } },
                    { 'metadata.status': null }
                ]
            }
        ]
    };

    const pipeline = [
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $limit: 100 }
    ];

    try {
        const usersRaw = await prisma.$runCommandRaw({
            aggregate: 'User',
            pipeline,
            cursor: { batchSize: 5000 }
        });
        console.log('Result count:', usersRaw.cursor?.firstBatch?.length);
    } catch (e) {
        console.error(e);
    }
    
    console.timeEnd('TeacherQuery');

    console.time('AdminQuery');
    
    const adminMatch = {
        role: 'STUDENT',
        $and: [
            {
                $or: [
                    { 'metadata.status': 'ACTIVE' },
                    { 'metadata.status': { $exists: false } },
                    { 'metadata.status': null }
                ]
            }
        ]
    };

    const adminPipeline = [
        { $match: adminMatch },
        { $sort: { createdAt: -1 } },
        { $limit: 100 }
    ];

    try {
        const usersRaw2 = await prisma.$runCommandRaw({
            aggregate: 'User',
            pipeline: adminPipeline,
            cursor: { batchSize: 5000 }
        });
        console.log('Admin Result count:', usersRaw2.cursor?.firstBatch?.length);
    } catch (e) {
        console.error(e);
    }
    console.timeEnd('AdminQuery');
    
    await prisma.$disconnect();
}

main();
