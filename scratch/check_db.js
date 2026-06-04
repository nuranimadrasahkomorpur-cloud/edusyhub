const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const categories = await prisma.accountCategory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
    });
    console.log("Recent Categories:", JSON.stringify(categories, null, 2));

    const transactions = await prisma.transaction.findMany({
        where: { categoryId: categories[0].id },
        select: { id: true, amount: true, date: true, status: true, studentId: true }
    });
    console.log("Transactions for latest category:", JSON.stringify(transactions, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
