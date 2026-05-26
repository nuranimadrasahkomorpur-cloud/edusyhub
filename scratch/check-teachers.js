const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const teachers = await prisma.teacherProfile.findMany({
            where: { instituteId: "69b03c35b2ae6e1d28ae2137" },
            include: { user: { select: { name: true, role: true } } }
        });
        console.log(JSON.stringify(teachers, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
