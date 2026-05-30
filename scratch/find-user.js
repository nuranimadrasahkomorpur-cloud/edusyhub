const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    console.log('Searching for email: superadmin@edusy.com');
    const u1 = await p.user.findFirst({
        where: { email: { equals: 'superadmin@edusy.com', mode: 'insensitive' } }
    });
    console.log('User found by email:', u1);

    console.log('Searching for any ADMIN or SUPERADMIN:');
    const admins = await p.user.findMany({
        where: {
            role: { in: ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'] }
        }
    });
    console.log('Admins found:', JSON.stringify(admins, null, 2));

    await p.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
