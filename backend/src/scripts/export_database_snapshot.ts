import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function exportSnapshot() {
  console.log('📦 Gerando snapshot local de segurança de todas as tabelas antes da limpeza...');

  const snapshot = {
    metadata: {
      exportedAt: new Date().toISOString(),
      databaseUrl: (process.env.DATABASE_URL || '').replace(/:([^:@]+)@/, ':****@'),
    },
    tables: {
      User: await prisma.user.findMany(),
      AdminProfile: await prisma.adminProfile.findMany(),
      EstablishmentProfile: await prisma.establishmentProfile.findMany(),
      ProfessionalProfile: await prisma.professionalProfile.findMany(),
      Pet: await prisma.pet.findMany(),
      Service: await prisma.service.findMany(),
      Product: await prisma.product.findMany(),
      Appointment: await prisma.appointment.findMany(),
      Order: await prisma.order.findMany(),
      OrderItem: await prisma.orderItem.findMany(),
      CartItem: await prisma.cartItem.findMany(),
      PaymentMethod: await prisma.paymentMethod.findMany(),
      CashbackTransaction: await prisma.cashbackTransaction.findMany(),
      CashbackVoucher: await prisma.cashbackVoucher.findMany(),
      TermsAcceptance: await prisma.termsAcceptance.findMany(),
      Employee: await prisma.employee.findMany(),
      EmployeeService: await prisma.employeeService.findMany(),
      Notification: await prisma.notification.findMany(),
      AuthVerificationCode: await prisma.authVerificationCode.findMany(),
      Conversation: await prisma.conversation.findMany(),
      Message: await prisma.message.findMany(),
      ModerationReport: await prisma.moderationReport.findMany(),
      AdminAuditLog: await prisma.adminAuditLog.findMany(),
      PartnerProgramParticipation: await prisma.partnerProgramParticipation.findMany(),
      PartnerPayout: await prisma.partnerPayout.findMany(),
      Review: await prisma.review.findMany(),
      GoogleCalendarConnection: await prisma.googleCalendarConnection.findMany(),
      CalendarEventSync: await prisma.calendarEventSync.findMany(),
      CalendarSyncLog: await prisma.calendarSyncLog.findMany(),
    },
  };

  const backupFilePath = path.resolve(process.cwd(), 'backup_pre_cleanup.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(snapshot, null, 2), 'utf-8');

  const stats = fs.statSync(backupFilePath);
  console.log(`✅ Snapshot de segurança salvo com sucesso em: ${backupFilePath}`);
  console.log(`📊 Tamanho do snapshot: ${(stats.size / 1024).toFixed(2)} KB`);
}

exportSnapshot()
  .catch((err) => {
    console.error('💥 Erro ao exportar snapshot:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
