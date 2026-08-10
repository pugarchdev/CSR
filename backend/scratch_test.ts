import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const enquiries = await prisma.corporateEnquiry.findMany();
  console.log(JSON.stringify(enquiries.map(e => ({ id: e.id, status: e.status, assignedRmId: (e as any).assignedRelationshipManagerId })), null, 2));
}

main().finally(() => prisma.$disconnect());
