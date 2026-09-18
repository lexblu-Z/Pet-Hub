import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin';
  const plainPassword = 'admin';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      password: hashedPassword,
      hasPassword: true,
    },
    create: {
      name: 'Administrador do Sistema',
      email: adminEmail,
      password: hashedPassword,
      hasPassword: true,
      role: Role.ADMIN,
      defaultAvatar: '/user.jpg',
      adminProfile: {
        create: {},
      },
    },
  });

  // Ensure AdminProfile relation exists
  await prisma.adminProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  console.log(`✅ Conta ADMIN local configurada com sucesso! (ID: ${admin.id}, Role: ${admin.role})`);

  // Ensure all users have a deterministic defaultAvatar if not set
  const defaultAvatars = [
    '/user.jpg',
    '/user2.jpg',
    '/user3.jpg',
    '/user4.jpg',
    '/user5.jpg',
    '/user6.jpg',
  ];

  function getStableAvatar(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return defaultAvatars[Math.abs(hash) % defaultAvatars.length];
  }

  const users = await prisma.user.findMany();
  for (const user of users) {
    if (!user.defaultAvatar) {
      const assigned = getStableAvatar(user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultAvatar: assigned },
      });
      console.log(`✅ Assigned ${assigned} to ${user.name} (${user.email})`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });