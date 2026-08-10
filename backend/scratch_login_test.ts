import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
  const rm = await prisma.user.findFirst({
    where: { roleId: 6, accountStatus: 'ACTIVE' }
  });

  if (!rm) {
    console.log("No active RM found");
    return;
  }
  console.log("RM found:", rm.email, rm.id);

  // Let's create a token for RM
  const secret = process.env.JWT_SECRET || "mahacsr_secure_jwt_secret_2026_dev_mode_only_998877"; 
  // Wait, I should fetch the actual JWT_SECRET from backend/.env
}

main().finally(() => prisma.$disconnect());
