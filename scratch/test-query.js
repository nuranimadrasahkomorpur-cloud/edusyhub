const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const identifier = 'superadmin@edusy.com';
        const user = await prisma.user.findFirst({
            where: { email: { equals: identifier, mode: 'insensitive' } },
            include: {
                institutes: { select: { id: true, name: true, type: true, logo: true, coverImage: true, address: true } },
                teacherProfiles: true
            }
        });
        console.log('Query output:', JSON.stringify(user, null, 2));
    } catch (e) {
        console.error('CRITICAL QUERY ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
