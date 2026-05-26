import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'সেলিম' } },
                { role: 'ADMIN' },
                { role: 'SUPER_ADMIN' }
            ]
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            instituteIds: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
