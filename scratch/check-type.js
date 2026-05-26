const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { id: "69b03aa4a7d9d04cb964ccd0" },
            select: { instituteIds: true }
        });
        console.log("InstituteIds Type:", typeof user.instituteIds[0]);
        console.log("InstituteIds Value:", user.instituteIds);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
