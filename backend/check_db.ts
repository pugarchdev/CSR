import prisma from "./src/config/db";

async function main() {
  const enquiries = await prisma.corporateEnquiry.findMany();
  console.log("Total Enquiries:", enquiries.length);
  console.log(enquiries.map(e => ({ id: e.id, submittedByUserId: e.submittedByUserId, organizationId: e.organizationId })));

  const users = await prisma.user.findMany({ select: { id: true, roleId: true, role: true } });
  console.log("Total Users:", users.length);
  console.log(users.filter(u => u.id === 'ed19ef72-b627-4cd7-8415-44684f531f84' || u.id === enquiries[0]?.submittedByUserId));
}

main().catch(console.error).finally(() => prisma.$disconnect());
