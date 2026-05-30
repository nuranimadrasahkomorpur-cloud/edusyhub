const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const users = await p.user.findMany({
        select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            password: true,
            name: true
        }
    });
    console.log('All Users in DB:', JSON.stringify(users, null, 2));
    await p.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
