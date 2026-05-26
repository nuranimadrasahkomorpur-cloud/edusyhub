const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const students = await prisma.user.findMany({ 
            where: { 
                role: 'STUDENT', 
                instituteIds: { has: "69b03c35b2ae6e1d28ae2137" }
            },
            select: { metadata: true }
        });
        const total = students.length;
        const withClass = students.filter(s => s.metadata && s.metadata.classId).length;
        const withAdmissionApproved = students.filter(s => s.metadata && s.metadata.admissionStatus === 'APPROVED').length;
        console.log({ total, withClass, withAdmissionApproved });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
