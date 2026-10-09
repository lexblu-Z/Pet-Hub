import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

async function verifyPostCleanup() {
  console.log('====================================================');
  console.log('🔍 VERIFICAÇÃO PÓS-LIMPEZA DO BANCO DE DADOS PETHUB');
  console.log('====================================================\n');

  let allPassed = true;
  function assert(cond: boolean, desc: string, detail?: string) {
    if (cond) {
      console.log(`✅ [PASS] ${desc}`);
    } else {
      console.error(`❌ [FAIL] ${desc} - ${detail || 'Erro na asserção'}`);
      allPassed = false;
    }
  }

  // 1. Verificar Usuários
  const totalUsers = await prisma.user.count();
  const allUsers = await prisma.user.findMany({
    include: { adminProfile: true },
  });

  assert(totalUsers === 1, `Total de usuários no banco é exatamente 1 (obtido: ${totalUsers})`);
  assert(allUsers[0]?.role === 'ADMIN', `O único usuário remanescente possui role ADMIN (obtido: ${allUsers[0]?.role})`);
  assert(allUsers[0]?.id === '30ca9077-b6fd-4c14-84fc-6946109cb800', `O ID do Admin foi preservado intacto (${allUsers[0]?.id})`);
  assert(allUsers[0]?.email === 'admin', `O login/email do Admin foi preservado intacto (${allUsers[0]?.email})`);
  assert(allUsers[0]?.adminProfile !== null, 'O AdminProfile correspondente permanece vinculado ao Admin');

  // Testar integridade do login do Admin
  const isPasswordValid = await bcrypt.compare('admin123', allUsers[0]?.password || '');
  assert(isPasswordValid, 'Credenciais do Admin funcionais e íntegras com hash seguro');

  // 2. Verificar Contagem de Todas as Entidades Operacionais
  console.log('\n--- Verificação de Zeramento de Entidades Operacionais ---');
  const counts = {
    TUTORES: await prisma.user.count({ where: { role: 'TUTOR' } }),
    PROFISSIONAIS: await prisma.user.count({ where: { role: 'PROFESSIONAL' } }),
    ESTABELECIMENTOS: await prisma.user.count({ where: { role: 'ESTABLISHMENT' } }),
    EstablishmentProfile: await prisma.establishmentProfile.count(),
    ProfessionalProfile: await prisma.professionalProfile.count(),
    Pet: await prisma.pet.count(),
    Service: await prisma.service.count(),
    Product: await prisma.product.count(),
    Appointment: await prisma.appointment.count(),
    Order: await prisma.order.count(),
    OrderItem: await prisma.orderItem.count(),
    CartItem: await prisma.cartItem.count(),
    PaymentMethod: await prisma.paymentMethod.count(),
    CashbackTransaction: await prisma.cashbackTransaction.count(),
    CashbackVoucher: await prisma.cashbackVoucher.count(),
    TermsAcceptance: await prisma.termsAcceptance.count(),
    Employee: await prisma.employee.count(),
    EmployeeService: await prisma.employeeService.count(),
    Notification: await prisma.notification.count(),
    AuthVerificationCode: await prisma.authVerificationCode.count(),
    Conversation: await prisma.conversation.count(),
    Message: await prisma.message.count(),
    ModerationReport: await prisma.moderationReport.count(),
    AdminAuditLog: await prisma.adminAuditLog.count(),
    PartnerProgramParticipation: await prisma.partnerProgramParticipation.count(),
    PartnerPayout: await prisma.partnerPayout.count(),
    Review: await prisma.review.count(),
    GoogleCalendarConnection: await prisma.googleCalendarConnection.count(),
    CalendarEventSync: await prisma.calendarEventSync.count(),
    CalendarSyncLog: await prisma.calendarSyncLog.count(),
  };

  for (const [table, count] of Object.entries(counts)) {
    assert(count === 0, `Tabela/Entidade ${table.padEnd(28)}: ${count} registros (Esperado: 0)`);
  }

  // 3. Verificação do Dashboard Administrativo
  console.log('\n--- Verificação das Métricas Calculadas do Dashboard ---');
  const [
    dbTotalUsers,
    dbTotalPets,
    dbActiveEstabs,
    dbTotalAppointments,
    dbCompletedAppointments,
    dbPaidOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.pet.count(),
    prisma.establishmentProfile.count({ where: { status: 'ACTIVE' } }),
    prisma.appointment.count(),
    prisma.appointment.findMany({ where: { status: 'COMPLETED' }, include: { service: true } }),
    prisma.order.findMany({ where: { status: { in: ['PAID', 'DELIVERED', 'COMPLETED'] } } }),
  ]);

  const appRevenue = dbCompletedAppointments.reduce((sum, app) => sum + (app.service?.price || 0), 0);
  const orderRevenue = dbPaidOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
  const totalRevenue = appRevenue + orderRevenue;

  assert(dbTotalUsers === 1, `Usuários no Dashboard: ${dbTotalUsers} (apenas Admin)`);
  assert(dbTotalPets === 0, `Pets no Dashboard: ${dbTotalPets}`);
  assert(dbActiveEstabs === 0, `Estabelecimentos no Dashboard: ${dbActiveEstabs}`);
  assert(dbTotalAppointments === 0, `Agendamentos no Dashboard: ${dbTotalAppointments}`);
  assert(totalRevenue === 0, `Receita Total no Dashboard: R$ ${totalRevenue.toFixed(2)}`);
  assert(orderRevenue === 0, `Vendas de Produtos no Dashboard: R$ ${orderRevenue.toFixed(2)}`);

  // 4. Verificação de Arquivos Físicos em Uploads
  console.log('\n--- Verificação de Arquivos Físicos em Uploads ---');
  const uploadsDir = path.resolve(process.cwd(), '../uploads');
  const avatars = fs.existsSync(path.join(uploadsDir, 'avatars')) ? fs.readdirSync(path.join(uploadsDir, 'avatars')) : [];
  const pets = fs.existsSync(path.join(uploadsDir, 'pets')) ? fs.readdirSync(path.join(uploadsDir, 'pets')) : [];
  const images = fs.existsSync(path.join(uploadsDir, 'images')) ? fs.readdirSync(path.join(uploadsDir, 'images')) : [];

  assert(avatars.length === 0, `Diretório avatars limpo (arquivos: ${avatars.length})`);
  assert(images.length === 0, `Diretório images limpo (arquivos: ${images.length})`);
  assert(pets.length === 1 && pets[0] === 'pet_fav.png', `Diretório pets preservou apenas pet_fav.png (arquivos: ${pets.join(', ')})`);

  // Verificar assets oficiais
  const icones = fs.existsSync(path.join(uploadsDir, 'icones')) ? fs.readdirSync(path.join(uploadsDir, 'icones')) : [];
  const pgmntos = fs.existsSync(path.join(uploadsDir, 'pgmntos')) ? fs.readdirSync(path.join(uploadsDir, 'pgmntos')) : [];
  const easterEggs = fs.existsSync(path.join(uploadsDir, 'easter-egg´s')) ? fs.readdirSync(path.join(uploadsDir, 'easter-egg´s')) : [];

  assert(icones.includes('Whatsapp-logo-vetor.png'), 'Ícone oficial do WhatsApp preservado');
  assert(pgmntos.includes('logo_pix.svg'), 'Ícone oficial do Pix preservado');
  assert(easterEggs.length > 0, `Assets da Landing Page e Easter Eggs preservados (${easterEggs.length} itens)`);

  console.log('\n====================================================');
  console.log(`🏁 RESULTADO GERAL DA VERIFICAÇÃO: ${allPassed ? 'TODOS OS TESTES PASSARAM COM SUCESSO' : 'FALHA EM TESTES'}`);
  console.log('====================================================');

  if (!allPassed) process.exit(1);
}

verifyPostCleanup()
  .catch((err) => {
    console.error('💥 Erro durante a verificação pós-limpeza:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
