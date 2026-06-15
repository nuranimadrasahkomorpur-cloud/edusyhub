const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Creating indexes...');
        await prisma.$runCommandRaw({
            createIndexes: 'User',
            indexes: [
                {
                    key: { role: 1, 'metadata.classId': 1 },
                    name: 'role_classId_idx'
                },
                {
                    key: { 'metadata.classId': 1 },
                    name: 'classId_idx'
                }
            ]
        });
        console.log('User indexes created.');

        await prisma.$runCommandRaw({
            createIndexes: 'Attendance',
            indexes: [
                {
                    key: { dateString: 1, instituteId: 1, classId: 1 },
                    name: 'date_inst_class_idx'
                }
            ]
        });
        console.log('Attendance indexes created.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
