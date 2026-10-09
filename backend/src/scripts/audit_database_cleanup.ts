import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 AUDITORIA COMPLETA DO BANCO DE DADOS PETHUB');
  console.log('====================================================\n');

  // 1. Identificar Usuários e Admins
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      hasPassword: true,
      adminProfile: { select: { id: true } },
      establishmentProfile: { select: { id: true, businessName: true } },
      professionalProfile: { select: { id: true, specialty: true } },
    },
    orderBy: { role: 'asc' },
  });

  const admins = users.filter((u) => u.role === 'ADMIN');
  const nonAdmins = users.filter((u) => u.role !== 'ADMIN');

  console.log(`📌 TOTAL DE USUÁRIOS NO BANCO: ${users.length}`);
  console.log(`👑 ADMINS ENCONTRADOS (${admins.length}):`);
  for (const adm of admins) {
    console.log(`   - ID: ${adm.id}`);
    console.log(`     Nome: ${adm.name}`);
    console.log(`     Email: ${adm.email}`);
    console.log(`     Role: ${adm.role}`);
    console.log(`     Tem AdminProfile: ${adm.adminProfile ? 'SIM' : 'NÃO'}`);
    console.log(`     Criado em: ${adm.createdAt.toISOString()}`);
  }

  console.log(`\n👥 USUÁRIOS NÃO-ADMIN A SEREM REMOVIDOS (${nonAdmins.length}):`);
  const countByRole: Record<string, number> = {};
  for (const u of nonAdmins) {
    countByRole[u.role] = (countByRole[u.role] || 0) + 1;
  }
  for (const [role, count] of Object.entries(countByRole)) {
    console.log(`   - ${role}: ${count}`);
  }

  // 2. Contagem exata de todas as 29 tabelas
  console.log('\n📊 CONTAGEM EXATA DE REGISTROS POR MODELO:');
  const counts = {
    User: await prisma.user.count(),
    AdminProfile: await prisma.adminProfile.count(),
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

  for (const [modelName, count] of Object.entries(counts)) {
    console.log(`   ${modelName.padEnd(30)}: ${count}`);
  }

  // 3. Detalhes de AdminAuditLog
  const auditLogs = await prisma.adminAuditLog.findMany({
    select: { id: true, adminId: true, action: true, entity: true, createdAt: true },
  });
  console.log(`\n📋 AdminAuditLogs existentes: ${auditLogs.length}`);
  for (const log of auditLogs) {
    const isAdmin = admins.some((a) => a.id === log.adminId);
    console.log(`   - Log ID ${log.id}: Ação="${log.action}", Entidade="${log.entity}", AdminId=${log.adminId} (Pertence a Admin: ${isAdmin ? 'SIM' : 'NÃO'})`);
  }

  // 4. Detalhes de ModerationReports, Services e Products
  const reports = await prisma.moderationReport.findMany({
    select: { id: true, reportNumber: true, targetType: true, reporterId: true, reportedUserId: true, reason: true },
  });
  console.log(`\n🚨 ModerationReports existentes: ${reports.length}`);

  const services = await prisma.service.findMany({
    select: { id: true, name: true, price: true, establishmentId: true, professionalId: true },
  });
  console.log(`\n🛠️ Serviços existentes: ${services.length}`);
  for (const s of services) {
    console.log(`   - Serviço "${s.name}" (R$ ${s.price}) | Estabelecimento: ${s.establishmentId} | Profissional: ${s.professionalId}`);
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true, stock: true, establishmentId: true },
  });
  console.log(`\n📦 Produtos existentes: ${products.length}`);
  for (const p of products) {
    console.log(`   - Produto "${p.name}" (R$ ${p.price}, Estoque: ${p.stock}) | Estabelecimento: ${p.establishmentId}`);
  }

  // 5. Tabelas físicas no PostgreSQL
  const pgTables: any[] = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`
  );
  console.log(`\n🗄️ TABELAS FÍSICAS NO POSTGRESQL (${pgTables.length}):`);
  console.log(pgTables.map((t) => t.table_name).join(', '));

  // 6. Auditoria de arquivos em uploads
  console.log('\n📁 AUDITORIA DE DIRETÓRIOS DE UPLOADS:');
  const possibleUploadDirs = [
    path.resolve(process.cwd(), '../uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), '../pethub-frontend/public/uploads'),
  ];

  for (const dir of possibleUploadDirs) {
    if (fs.existsSync(dir)) {
      console.log(`   Encontrado diretório: ${dir}`);
      const files = fs.readdirSync(dir, { recursive: true });
      console.log(`   Total de itens no diretório: ${files.length}`);
    } else {
      console.log(`   Diretório não existe: ${dir}`);
    }
  }

  // 6. Verificar DATABASE_URL (sem expor senha)
  const dbUrl = process.env.DATABASE_URL || '';
  const sanitizedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`\n🛢️ BANCO DE DADOS CONECTADO: ${sanitizedDbUrl}`);
}

runAudit()
  .catch((err) => {
    console.error('💥 Erro na auditoria:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
