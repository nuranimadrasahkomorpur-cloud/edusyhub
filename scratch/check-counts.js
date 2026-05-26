const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const counts = await Promise.all([
            prisma.user.count({ where: { role: 'STUDENT', instituteIds: { has: "699098a96efcaf26224df245" } } }),
            prisma.user.count({ where: { role: 'STUDENT', instituteIds: { has: "69b03c35b2ae6e1d28ae2137" } } })
        ]);
        console.log({
            "699098a96efcaf26224df245": counts[0],
            "69b03c35b2ae6e1d28ae2137": counts[1]
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
