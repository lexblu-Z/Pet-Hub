import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Script de Execução Segura e Transacional da Limpeza Total dos Dados de Teste/Operação do PetHub.
 * 
 * ATENÇÃO: ESTE SCRIPT APENAS SERÁ EXECUTADO APÓS A CONFIRMAÇÃO EXPLÍCITA DO USUÁRIO ("EXECUTAR LIMPEZA").
 */
export async function executeDatabaseCleanup() {
  console.log('====================================================');
  console.log('🛡️ EXECUTANDO LIMPEZA TOTAL DE DADOS DE TESTE (PETHUB)');
  console.log('====================================================\n');

  // 1. Identificar e proteger o ADMIN
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    include: { adminProfile: true },
  });

  if (admins.length === 0) {
    throw new Error('❌ ABORTADO: Nenhum usuário com role ADMIN foi encontrado no banco. Abortando por segurança!');
  }

  if (admins.length > 1) {
    throw new Error(`❌ ABORTADO: Encontrados ${admins.length} administradores. Exclusão abortada para preservar todos os administradores!`);
  }

  const adminToPreserve = admins[0];
  console.log(`👑 ADMIN AUTORIZADO E PROTEGIDO:`);
  console.log(`   - ID: ${adminToPreserve.id}`);
  console.log(`   - Nome: ${adminToPreserve.name}`);
  console.log(`   - Email/Username: ${adminToPreserve.email}`);
  console.log(`   - Role: ${adminToPreserve.role}`);
  console.log(`   - AdminProfile ID: ${adminToPreserve.adminProfile?.id || 'Nenhum'}`);
  console.log(`   - Criado em: ${adminToPreserve.createdAt.toISOString()}`);
  console.log('----------------------------------------------------\n');

  // 2. Executar deleção atômica em ordem estrita de chaves estrangeiras
  const stats = await prisma.$transaction(async (tx) => {
    console.log('🧹 [1/28] Limpando AdminAuditLog...');
    const auditLogs = await tx.adminAuditLog.deleteMany({});

    console.log('🧹 [2/28] Limpando ModerationReport...');
    const reports = await tx.moderationReport.deleteMany({});

    console.log('🧹 [3/28] Limpando Review...');
    const reviews = await tx.review.deleteMany({});

    console.log('🧹 [4/28] Limpando CalendarSyncLog...');
    const calendarLogs = await tx.calendarSyncLog.deleteMany({});

    console.log('🧹 [5/28] Limpando CalendarEventSync...');
    const calendarEvents = await tx.calendarEventSync.deleteMany({});

    console.log('🧹 [6/28] Limpando GoogleCalendarConnection...');
    const googleConns = await tx.googleCalendarConnection.deleteMany({});

    console.log('🧹 [7/28] Limpando PartnerPayout...');
    const partnerPayouts = await tx.partnerPayout.deleteMany({});

    console.log('🧹 [8/28] Limpando PartnerProgramParticipation...');
    const partnerPrograms = await tx.partnerProgramParticipation.deleteMany({});

    console.log('🧹 [9/28] Limpando OrderItem...');
    const orderItems = await tx.orderItem.deleteMany({});

    console.log('🧹 [10/28] Limpando CartItem...');
    const cartItems = await tx.cartItem.deleteMany({});

    console.log('🧹 [11/28] Limpando Order...');
    const orders = await tx.order.deleteMany({});

    console.log('🧹 [12/28] Limpando Appointment...');
    const appointments = await tx.appointment.deleteMany({});

    console.log('🧹 [13/28] Limpando EmployeeService...');
    const empServices = await tx.employeeService.deleteMany({});

    console.log('🧹 [14/28] Limpando Employee...');
    const employees = await tx.employee.deleteMany({});

    console.log('🧹 [15/28] Limpando Product...');
    const products = await tx.product.deleteMany({});

    console.log('🧹 [16/28] Limpando Service...');
    const services = await tx.service.deleteMany({});

    console.log('🧹 [17/28] Limpando Pet...');
    const pets = await tx.pet.deleteMany({});

    console.log('🧹 [18/28] Limpando Message...');
    const messages = await tx.message.deleteMany({});

    console.log('🧹 [19/28] Limpando Conversation...');
    const conversations = await tx.conversation.deleteMany({});

    console.log('🧹 [20/28] Limpando CashbackTransaction...');
    const cashbackTx = await tx.cashbackTransaction.deleteMany({});

    console.log('🧹 [21/28] Limpando CashbackVoucher...');
    const cashbackVouchers = await tx.cashbackVoucher.deleteMany({});

    console.log('🧹 [22/28] Limpando TermsAcceptance...');
    const terms = await tx.termsAcceptance.deleteMany({});

    console.log('🧹 [23/28] Limpando PaymentMethod...');
    const paymentMethods = await tx.paymentMethod.deleteMany({});

    console.log('🧹 [24/28] Limpando Notification...');
    const notifications = await tx.notification.deleteMany({});

    console.log('🧹 [25/28] Limpando AuthVerificationCode...');
    const authCodes = await tx.authVerificationCode.deleteMany({});

    console.log('🧹 [26/28] Limpando EstablishmentProfile...');
    const estabProfiles = await tx.establishmentProfile.deleteMany({
      where: { userId: { not: adminToPreserve.id } },
    });

    console.log('🧹 [27/28] Limpando ProfessionalProfile...');
    const profProfiles = await tx.professionalProfile.deleteMany({
      where: { userId: { not: adminToPreserve.id } },
    });

    console.log('🧹 [28/28] Removendo todos os Users não-ADMIN...');
    const nonAdminUsers = await tx.user.deleteMany({
      where: {
        id: { not: adminToPreserve.id },
        role: { not: 'ADMIN' },
      },
    });

    return {
      adminAuditLogsDeleted: auditLogs.count,
      reportsDeleted: reports.count,
      reviewsDeleted: reviews.count,
      calendarLogsDeleted: calendarLogs.count,
      calendarEventsDeleted: calendarEvents.count,
      googleConnsDeleted: googleConns.count,
      partnerPayoutsDeleted: partnerPayouts.count,
      partnerProgramsDeleted: partnerPrograms.count,
      orderItemsDeleted: orderItems.count,
      cartItemsDeleted: cartItems.count,
      ordersDeleted: orders.count,
      appointmentsDeleted: appointments.count,
      empServicesDeleted: empServices.count,
      employeesDeleted: employees.count,
      productsDeleted: products.count,
      servicesDeleted: services.count,
      petsDeleted: pets.count,
      messagesDeleted: messages.count,
      conversationsDeleted: conversations.count,
      cashbackTxDeleted: cashbackTx.count,
      cashbackVouchersDeleted: cashbackVouchers.count,
      termsDeleted: terms.count,
      paymentMethodsDeleted: paymentMethods.count,
      notificationsDeleted: notifications.count,
      authCodesDeleted: authCodes.count,
      estabProfilesDeleted: estabProfiles.count,
      profProfilesDeleted: profProfiles.count,
      usersDeleted: nonAdminUsers.count,
    };
  });

  console.log('\n✅ Transação de limpeza no banco concluída com sucesso!');
  console.log(stats);

  // 3. Limpar arquivos físicos de uploads de teste preservando assets oficiais
  console.log('\n📂 Limpando arquivos de upload de testes...');
  const uploadsDir = path.resolve(process.cwd(), '../uploads');
  let filesRemoved = 0;

  // Avatars de teste
  const avatarsDir = path.join(uploadsDir, 'avatars');
  if (fs.existsSync(avatarsDir)) {
    const avatarFiles = fs.readdirSync(avatarsDir);
    for (const file of avatarFiles) {
      fs.unlinkSync(path.join(avatarsDir, file));
      filesRemoved++;
    }
  }

  // Fotos de pets de teste (preservando pet_fav.png)
  const petsDir = path.join(uploadsDir, 'pets');
  if (fs.existsSync(petsDir)) {
    const petFiles = fs.readdirSync(petsDir);
    for (const file of petFiles) {
      if (file !== 'pet_fav.png') {
        fs.unlinkSync(path.join(petsDir, file));
        filesRemoved++;
      }
    }
  }

  // Fotos de imagens de produtos/estabelecimentos de teste
  const imagesDir = path.join(uploadsDir, 'images');
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir);
    for (const file of imageFiles) {
      fs.unlinkSync(path.join(imagesDir, file));
      filesRemoved++;
    }
  }

  console.log(`🗑️ Total de arquivos físicos de upload removidos: ${filesRemoved}`);
  console.log('🔒 Assets oficiais preservados: uploads/icones/, uploads/pgmntos/, uploads/easter-egg´s/, uploads/pets/pet_fav.png');

  return { stats, filesRemoved, adminToPreserve };
}

if (process.argv.includes('--run')) {
  executeDatabaseCleanup()
    .catch((err) => {
      console.error('💥 Erro fatal na limpeza:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
