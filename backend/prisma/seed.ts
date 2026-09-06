import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin'; // Using 'admin' explicitly as requested for local dev
  const plainPassword = 'adm';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    await prisma.user.create({
      data: {
        name: 'Administrador do Sistema',
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
      }
    });
    
    console.log(`✅ Conta ADMIN criada com sucesso!`);
    console.log(`Login: ${adminEmail}`);
    console.log(`Senha: ${plainPassword}`);
  } else {
    console.log(`⚠️ Conta ADMIN já existe no banco de dados.`);
  }

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