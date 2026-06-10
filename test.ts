import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'hmdselim10@gmill.com' }
    });
    console.log(user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
