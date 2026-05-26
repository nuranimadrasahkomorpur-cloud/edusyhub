const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const users = await p.user.findMany({
        take: 10,
        orderBy: { id: 'desc' },
        select: { id: true, name: true, role: true, email: true, phone: true, password: true, metadata: true }
    });
    console.log('Recent users:', JSON.stringify(users, null, 2));

    await p.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
