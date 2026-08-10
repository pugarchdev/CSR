import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './src/config/env';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  const rm = await prisma.user.findFirst({
    where: { roleId: 6, accountStatus: 'ACTIVE' },
    select: { id: true, email: true, tokenVersion: true }
  });

  if (!rm) {
    console.log('No RM found');
    return;
  }
  
  console.log('RM ID:', rm.id);

  const token = jwt.sign(
    { id: rm.id, email: rm.email, tokenVersion: rm.tokenVersion },
    getJwtSecret(),
    { expiresIn: '1h' }
  );

  console.log('--- Fetching /api/rm/enquiries ---');
  try {
    const res = await axios.get('http://localhost:5000/api/rm/enquiries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    console.log('Body:', res.data);
  } catch (err: any) {
    console.log('Error:', err.response?.status, err.response?.data);
  }

  console.log('--- Fetching /api/corporate-enquiries ---');
  try {
    const res = await axios.get('http://localhost:5000/api/corporate-enquiries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    console.log('Body:', res.data);
  } catch (err: any) {
    console.log('Error:', err.response?.status, err.response?.data);
  }
}

main().finally(() => prisma.$disconnect());
