import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const now = new Date();
    
    // Find categories that are fixed frequency
    const categories = await prisma.accountCategory.findMany({});
    const fixedCategoryIds = categories
        .filter((c: any) => c.config?.frequencyType === 'fixed')
        .map(c => c.id);

    console.log(`Found ${fixedCategoryIds.length} fixed categories.`);

    if (fixedCategoryIds.length > 0) {
        // Delete pending fees that are strictly in the future (next month or later)
        // Since the dates are typically the 1st of the month, we can just check if they are in the future
        // We'll delete anything where date > current date, BUT we have to be careful with timezones.
        // Let's just fetch them and check in JS to be 100% safe.
        
        const futureFees = await prisma.transaction.findMany({
            where: {
                status: 'PENDING',
                categoryId: { in: fixedCategoryIds },
            }
        });

        const toDeleteIds = [];
        for (const fee of futureFees) {
            const feeDate = new Date(fee.date);
            // If it's strictly next month or later
            if (feeDate.getFullYear() > now.getFullYear() || (feeDate.getFullYear() === now.getFullYear() && feeDate.getMonth() > now.getMonth())) {
                toDeleteIds.push(fee.id);
            }
        }

        console.log(`Found ${toDeleteIds.length} mistakenly generated future PENDING fees.`);

        if (toDeleteIds.length > 0) {
            const result = await prisma.transaction.deleteMany({
                where: {
                    id: { in: toDeleteIds }
                }
            });
            console.log(`Deleted ${result.count} future PENDING fees successfully.`);
        } else {
            console.log('No future pending fees to delete.');
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
