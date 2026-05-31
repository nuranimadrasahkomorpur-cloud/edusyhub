const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('--- Teacher Profiles ---');
        const profiles = await prisma.teacherProfile.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true
                    }
                },
                institute: {
                    select: {
                        id: true,
                        name: true,
                        adminIds: true
                    }
                }
            }
        });
        console.log(JSON.stringify(profiles, null, 2));

        console.log('--- Institutes ---');
        const institutes = await prisma.institute.findMany();
        console.log(JSON.stringify(institutes, null, 2));

        console.log('--- Classes ---');
        const classes = await prisma.class.findMany();
        console.log(JSON.stringify(classes, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
