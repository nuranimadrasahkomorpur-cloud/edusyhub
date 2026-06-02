const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const id = '6a1bbe3ebb7fc33d56e38617';
        console.log('Checking category...');
        const category = await prisma.accountCategory.findUnique({
            where: { id }
        });
        console.log('Category:', category);

        if (category) {
            console.log('Would delete...');
            // await prisma.transaction.deleteMany({ where: { categoryId: id } });
            // await prisma.accountCategory.delete({ where: { id } });
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
