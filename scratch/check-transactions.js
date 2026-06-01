const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const transactions = await prisma.transaction.findMany({
            take: 5,
            where: {
                studentId: { not: null }
            }
        });
        console.log('Sample transactions:', JSON.stringify(transactions, null, 2));

        if (transactions.length > 0) {
            const studentIds = transactions.map(t => t.studentId).filter(Boolean);
            console.log('Querying users with IDs:', studentIds);
            const users = await prisma.user.findMany({
                where: {
                    id: { in: studentIds }
                },
                select: {
                    id: true,
                    name: true,
                    metadata: true
                }
            });
            console.log('Matched users:', JSON.stringify(users, null, 2));
        }
    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
