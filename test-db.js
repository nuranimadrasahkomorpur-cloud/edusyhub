const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txns = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(txns, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
