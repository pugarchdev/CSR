import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const rms = await prisma.user.findMany({
    where: { roleId: 6 },
    select: { id: true, email: true, accountStatus: true }
  });
  console.log('RMs:', rms);
}

main().finally(() => prisma.$disconnect());
