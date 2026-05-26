const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const institute = await prisma.institute.findUnique({
            where: { id: "69b03c35b2ae6e1d28ae2137" }
        });
        console.log("Institute AdminIds:", institute.adminIds);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
