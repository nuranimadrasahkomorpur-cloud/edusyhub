const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const institutes = await prisma.institute.findMany({
            where: {
                id: { in: ["69b03c35b2ae6e1d28ae2137", "699098a96efcaf26224df245"] }
            },
            select: {
                id: true,
                name: true
            }
        });
        console.log(JSON.stringify(institutes, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
