import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const PROTECTED_EMAILS = [
  'leonardoessouza@gmail.com',
  'tck@gmail.com',
];

async function cleanUsers() {
  console.log('=== INICIANDO AUDITORIA E LIMPEZA SEGURA DE CONTAS ===\n');

  // 1. Contagem e listagem inicial
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalBefore = allUsers.length;
  console.log(`Total de usuários antes da limpeza: ${totalBefore}`);

  // Separar usuários protegidos e usuários para exclusão
  const protectedUsers = allUsers.filter((user) => {
    const emailLower = user.email.toLowerCase().trim();
    const isProtectedEmail = PROTECTED_EMAILS.includes(emailLower);
    const isAdminRole = user.role === Role.ADMIN;
    return isProtectedEmail || isAdminRole;
  });

  const usersToDelete = allUsers.filter((user) => {
    const emailLower = user.email.toLowerCase().trim();
    const isProtectedEmail = PROTECTED_EMAILS.includes(emailLower);
    const isAdminRole = user.role === Role.ADMIN;
    return !isProtectedEmail && !isAdminRole;
  });

  console.log(`\nUsuários PRESERVADOS (${protectedUsers.length}):`);
  protectedUsers.forEach((u, i) => {
    console.log(`  [${i + 1}] ID: ${u.id} | Email: ${u.email} | Nome: ${u.name} | Role: ${u.role}`);
  });

  console.log(`\nUsuários que serão EXCLUÍDOS (${usersToDelete.length}):`);
  usersToDelete.forEach((u, i) => {
    console.log(`  [${i + 1}] ID: ${u.id} | Email: ${u.email} | Nome: ${u.name} | Role: ${u.role}`);
  });

  if (usersToDelete.length === 0) {
    console.log('\nNenhum usuário de teste para excluir. Banco já está limpo.');
    await prisma.$disconnect();
    return;
  }

  const idsToDelete = usersToDelete.map((u) => u.id);
  const emailsToDelete = usersToDelete.map((u) => u.email.toLowerCase().trim());

  console.log('\nExecutando exclusão transacional das 49 contas e seus registros associados...');

  await prisma.$transaction(async (tx) => {
    // 1. Desconectar / Deletar CalendarEventSync e GoogleCalendarConnection dos usuários a excluir
    await tx.calendarSyncLog.deleteMany({
      where: { connection: { userId: { in: idsToDelete } } },
    });
    await tx.calendarEventSync.deleteMany({
      where: { connection: { userId: { in: idsToDelete } } },
    });
    await tx.googleCalendarConnection.deleteMany({
      where: { userId: { in: idsToDelete } },
    });

    // 2. Deletar agendamentos onde os usuários a excluir participam
    await tx.calendarEventSync.deleteMany({
      where: {
        appointment: {
          OR: [
            { tutorId: { in: idsToDelete } },
            { establishmentId: { in: idsToDelete } },
            { professionalId: { in: idsToDelete } },
          ],
        },
      },
    });
    await tx.appointment.deleteMany({
      where: {
        OR: [
          { tutorId: { in: idsToDelete } },
          { establishmentId: { in: idsToDelete } },
          { professionalId: { in: idsToDelete } },
        ],
      },
    });

    // 3. Deletar serviços oferecidos por estabelecimentos/profissionais a excluir
    await tx.service.deleteMany({
      where: {
        OR: [
          { establishmentId: { in: idsToDelete } },
          { professionalId: { in: idsToDelete } },
        ],
      },
    });

    // 4. Deletar itens de pedidos e produtos criados por estabelecimentos a excluir
    await tx.orderItem.deleteMany({
      where: { establishmentId: { in: idsToDelete } },
    });
    await tx.product.deleteMany({
      where: { establishmentId: { in: idsToDelete } },
    });

    // 5. Deletar pedidos e itens de carrinho de tutores a excluir
    await tx.orderItem.deleteMany({
      where: { order: { tutorId: { in: idsToDelete } } },
    });
    await tx.order.deleteMany({
      where: { tutorId: { in: idsToDelete } },
    });
    await tx.cartItem.deleteMany({
      where: { tutorId: { in: idsToDelete } },
    });

    // 6. Deletar pets de tutores a excluir
    await tx.pet.deleteMany({
      where: { tutorId: { in: idsToDelete } },
    });

    // 7. Deletar funcionários de estabelecimentos a excluir
    await tx.employee.deleteMany({
      where: { establishmentId: { in: idsToDelete } },
    });

    // 8. Deletar notificações dos usuários a excluir
    await tx.notification.deleteMany({
      where: { userId: { in: idsToDelete } },
    });

    // 9. Deletar métodos de pagamento e transações de cashback
    await tx.paymentMethod.deleteMany({
      where: { userId: { in: idsToDelete } },
    });
    await tx.cashbackTransaction.deleteMany({
      where: { userId: { in: idsToDelete } },
    });

    // 10. Deletar perfis
    await tx.establishmentProfile.deleteMany({
      where: { userId: { in: idsToDelete } },
    });
    await tx.professionalProfile.deleteMany({
      where: { userId: { in: idsToDelete } },
    });
    await tx.adminProfile.deleteMany({
      where: { userId: { in: idsToDelete } },
    });

    // 11. Deletar códigos de verificação OTP dos e-mails a excluir
    await tx.authVerificationCode.deleteMany({
      where: { email: { in: emailsToDelete } },
    });

    // 12. Deletar os usuários
    const deleteResult = await tx.user.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    console.log(`Excluídos ${deleteResult.count} usuários com sucesso!`);
  });

  // Verificação pós-exclusão
  const remainingUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n=== RESULTADO FINAL DA AUDITORIA ===`);
  console.log(`Usuários antes: ${totalBefore}`);
  console.log(`Usuários excluídos: ${usersToDelete.length}`);
  console.log(`Usuários restantes: ${remainingUsers.length}`);
  console.log('\nUsuários ativos e íntegros no banco:');
  remainingUsers.forEach((u, i) => {
    console.log(`  [${i + 1}] ID: ${u.id} | Email: ${u.email} | Nome: ${u.name} | Role: ${u.role}`);
  });

  // Conferir produtos restantes
  const remainingProducts = await prisma.product.count();
  console.log(`\nProdutos restantes no banco de dados: ${remainingProducts}`);

  // Conferir pets restantes
  const remainingPets = await prisma.pet.findMany({
    select: { id: true, name: true, tutor: { select: { email: true } } },
  });
  console.log(`Pets restantes no banco de dados (${remainingPets.length}):`);
  remainingPets.forEach(p => {
    console.log(`  - Pet: "${p.name}" (Tutor: ${p.tutor.email})`);
  });

  await prisma.$disconnect();
}

cleanUsers().catch((err) => {
  console.error('Erro na limpeza do banco:', err);
  process.exit(1);
});
