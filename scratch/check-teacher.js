const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeacher() {
    const teacher = await prisma.user.findFirst({
        where: { role: 'TEACHER' },
        orderBy: { createdAt: 'desc' },
        include: { institutes: true }
    });
    console.log("Latest Teacher:", teacher ? { id: teacher.id, name: teacher.name, instituteIds: teacher.instituteIds, institutes: teacher.institutes } : null);
}

checkTeacher().then(() => prisma.$disconnect());
