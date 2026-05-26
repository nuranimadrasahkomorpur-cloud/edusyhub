const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const instituteId = "69b03c35b2ae6e1d28ae2137";
    const role = "STUDENT";
    const status = "ACTIVE";
    
    const match = {
        role: role,
        instituteIds: { $oid: instituteId },
        "metadata.admissionStatus": { $ne: 'PENDING' }
    };

    if (status === 'ACTIVE') {
        match.$and = match.$and || [];
        match.$and.push({
            $or: [
                { 'metadata.status': 'ACTIVE' },
                { 'metadata.status': { $exists: false } },
                { 'metadata.status': null }
            ]
        });
    }

    const pipeline = [
        { $match: match }
    ];

    try {
        const usersRaw = await prisma.$runCommandRaw({
            aggregate: 'User',
            pipeline,
            cursor: { batchSize: 5000 }
        });
        console.log("Found students with status ACTIVE:", usersRaw.cursor?.firstBatch?.length || 0);
    } catch (e) {
        console.error("Aggregation Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
