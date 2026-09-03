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
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });