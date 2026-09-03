import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDb() {
  const users = await prisma.user.findMany({
    where: { role: 'ESTABLISHMENT' },
    include: { establishmentProfile: true }
  });
  console.log('ESTABLISHMENT USERS:', JSON.stringify(users, null, 2));

  const otherUsers = await prisma.user.findMany();
  console.log('ALL USERS:', otherUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  await prisma.$disconnect();
}
checkDb();
