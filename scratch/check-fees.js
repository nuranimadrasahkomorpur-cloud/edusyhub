import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFees() {
    // get the institute by name or any institute
    const institutes = await prisma.institute.findMany({ take: 1 });
    const instituteId = institutes[0].id;
    console.log("Institute ID:", instituteId);

    const categories = await prisma.feeCategory.findMany({
        where: { instituteId }
    });
    console.log("Categories:", categories.map(c => c.name));

    const transactions = await prisma.transaction.findMany({
        where: { 
            instituteId,
            type: 'INCOME',
            status: 'PENDING'
        },
        take: 10
    });
    console.log("Sample pending transactions categories:", Array.from(new Set(transactions.map(t => t.category))));
}

checkFees().catch(console.error).finally(() => prisma.$disconnect());
