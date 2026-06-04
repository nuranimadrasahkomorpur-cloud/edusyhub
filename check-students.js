const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.user.findMany({
        where: {
            metadata: { path: ['studentId'], in: ['102', '103', '105'] }
        },
        select: { id: true, name: true, metadata: true }
    });
    
    console.dir(students, { depth: null });
    
    const s104 = await prisma.user.findFirst({
        where: { metadata: { path: ['studentId'], equals: '104' } },
        select: { id: true, name: true, metadata: true }
    });
    console.log('Student 104 (has dues):');
    console.dir(s104, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
