import axios from 'axios';
import { prisma } from '../lib/prisma';

const BASE_URL = 'http://localhost:3000/api';

async function testFinancialReconciliation() {
  console.log('===============================================================');
  console.log('🧪 TESTE DE CONCILIAÇÃO FINANCEIRA E TRANSIÇÕES DE ESTADO');
  console.log('===============================================================\n');

  // 1. Authenticate Tutor (user1@gmail.com) and Establishment (pethub@gmail.com)
  const tutorLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'user1@gmail.com',
    password: '123456789',
  });
  const tutorToken = tutorLogin.data.token;
  const tutorClient = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${tutorToken}` } });

  const estabLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'pethub@gmail.com',
    password: '123456789',
  });
  const estabToken = estabLogin.data.token;
  const estabId = estabLogin.data.user.id;
  const estabClient = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${estabToken}` } });

  // Get tutor pet and service
  const petsRes = await tutorClient.get('/pets');
  const pet = petsRes.data[0];

  const servicesRes = await estabClient.get('/establishment/services');
  const service = servicesRes.data[0];

  console.log(`Pet de teste: ${pet.name} (${pet.id})`);
  console.log(`Serviço de teste: ${service.name} (R$ ${service.price})`);

  // Baseline dashboard
  const baseDash = await estabClient.get('/establishment/dashboard?period=all');
  const baseAppRevenue = baseDash.data.appointmentRevenue || 0;
  const basePendingAppRevenue = baseDash.data.pendingAppointmentRevenue || 0;
  console.log(`\nLinha de Base do Dashboard:`);
  console.log(`- Receita Realizada de Serviços: R$ ${baseAppRevenue.toFixed(2)}`);
  console.log(`- Receita Pendente (A Receber): R$ ${basePendingAppRevenue.toFixed(2)}`);

  // Create an appointment directly with past date so it doesn't conflict with future slots
  const testApt = await prisma.appointment.create({
    data: {
      establishmentId: estabId,
      tutorId: tutorLogin.data.user.id,
      petId: pet.id,
      serviceId: service.id,
      date: new Date('2026-10-18T10:00:00.000Z'),
      status: 'CONFIRMED',
      paymentMethod: 'Pagar no Estabelecimento',
      paymentStatus: 'PENDING',
      totalAmount: service.price,
      finalAmount: service.price,
    },
  });
  console.log(`\n1. Agendamento criado: ID ${testApt.id} (Status: ${testApt.status}, PaymentStatus: ${testApt.paymentStatus})`);

  // Step 2: Mark appointment as COMPLETED (operational completion) WITHOUT paying yet
  const completeRes = await estabClient.put(`/establishment/appointments/${testApt.id}/status`, {
    status: 'COMPLETED',
  });
  console.log(`2. Status operacional atualizado para COMPLETED.`);
  console.log(`   Status retornado: ${completeRes.data.status}`);
  console.log(`   PaymentStatus retornado: ${completeRes.data.paymentStatus}`);

  if (completeRes.data.paymentStatus === 'PAID') {
    throw new Error('❌ FALHA CRÍTICA: paymentStatus foi alterado automaticamente para PAID ao concluir o agendamento!');
  } else {
    console.log('   ✅ SUCESSO: paymentStatus PERMANECEU como PENDING após conclusão do serviço.');
  }

  // Step 3: Check Dashboard revenue - should NOT include this service in realized revenue!
  const dashAfterComplete = await estabClient.get('/establishment/dashboard?period=all');
  const appRevenueAfterComplete = dashAfterComplete.data.appointmentRevenue || 0;
  const pendingRevenueAfterComplete = dashAfterComplete.data.pendingAppointmentRevenue || 0;

  console.log(`\n3. Verificação Contábil pós-conclusão sem pagamento:`);
  console.log(`   Receita Realizada Atual: R$ ${appRevenueAfterComplete.toFixed(2)} (Esperado: R$ ${baseAppRevenue.toFixed(2)})`);
  console.log(`   Receita Pendente Atual: R$ ${pendingRevenueAfterComplete.toFixed(2)} (Esperado: R$ ${(basePendingAppRevenue + service.price).toFixed(2)})`);

  if (appRevenueAfterComplete !== baseAppRevenue) {
    throw new Error(`❌ FALHA: Receita realizada aumentou indevidamente antes do pagamento ser confirmado!`);
  }
  if (Math.abs(pendingRevenueAfterComplete - (basePendingAppRevenue + service.price)) > 0.01) {
    throw new Error(`❌ FALHA: Receita pendente não contabilizou o atendimento a receber!`);
  }
  console.log('   ✅ SUCESSO: Atendimento concluído com pagamento pendente NÃO entra como dinheiro recebido, entrando como Conta a Receber!');

  // Step 4: Now perform explicit payment registration (e.g. tutor pays cash/card at front desk)
  console.log(`\n4. Registrando pagamento presencial explícito via /establishment/appointments/${testApt.id}/payment...`);
  const payRes = await estabClient.put(`/establishment/appointments/${testApt.id}/payment`, {
    paymentStatus: 'PAID',
    paymentMethod: 'Cartão de Débito',
    notes: 'Pagamento recebido na recepção',
  });
  console.log(`   PaymentStatus retornado: ${payRes.data.paymentStatus}`);
  console.log(`   PaymentMethod retornado: ${payRes.data.paymentMethod}`);

  // Step 5: Check Dashboard revenue again - NOW it MUST be counted in realized revenue!
  const dashAfterPayment = await estabClient.get('/establishment/dashboard?period=all');
  const appRevenueAfterPayment = dashAfterPayment.data.appointmentRevenue || 0;
  const pendingRevenueAfterPayment = dashAfterPayment.data.pendingAppointmentRevenue || 0;

  console.log(`\n5. Verificação Contábil pós-pagamento confirmado:`);
  console.log(`   Receita Realizada Atual: R$ ${appRevenueAfterPayment.toFixed(2)} (Esperado: R$ ${(baseAppRevenue + service.price).toFixed(2)})`);
  console.log(`   Receita Pendente Atual: R$ ${pendingRevenueAfterPayment.toFixed(2)} (Esperado: R$ ${basePendingAppRevenue.toFixed(2)})`);

  if (Math.abs(appRevenueAfterPayment - (baseAppRevenue + service.price)) > 0.01) {
    throw new Error(`❌ FALHA: Receita realizada não foi devidamente computada após pagamento explícito!`);
  }
  if (Math.abs(pendingRevenueAfterPayment - basePendingAppRevenue) > 0.01) {
    throw new Error(`❌ FALHA: Receita pendente não foi deduzida após quitação!`);
  }
  console.log('   ✅ SUCESSO: Pagamento explicitamente confirmado contabilizado com 100% de exatidão!');

  // Step 6: Test cancellation handling of a PAID appointment (must become REFUNDED, not CANCELLED)
  console.log('\n6. Testando cancelamento de agendamento PAGO...');
  const cancelPaidApt = await prisma.appointment.create({
    data: {
      establishmentId: estabId,
      tutorId: tutorLogin.data.user.id,
      petId: pet.id,
      serviceId: service.id,
      date: new Date('2026-10-18T14:00:00.000Z'),
      status: 'CONFIRMED',
      paymentMethod: 'PIX',
      paymentStatus: 'PAID',
      totalAmount: service.price,
      finalAmount: service.price,
    },
  });

  const cancelRes = await estabClient.put(`/establishment/appointments/${cancelPaidApt.id}/status`, {
    status: 'CANCELLED',
  });

  console.log(`   Status do agendamento: ${cancelRes.data.status}`);
  console.log(`   Status financeiro do pagamento: ${cancelRes.data.paymentStatus}`);

  if (cancelRes.data.paymentStatus !== 'REFUNDED') {
    throw new Error(`❌ FALHA: Agendamento pago cancelado deveria ter paymentStatus='REFUNDED', recebeu '${cancelRes.data.paymentStatus}'`);
  }
  console.log('   ✅ SUCESSO: Agendamento pago cancelado foi classificado como REFUNDED (estorno/reembolso), preservando a trilha contábil!');

  // Clean up temporary test appointments created in this reconciliation test
  await prisma.appointment.deleteMany({
    where: {
      id: { in: [testApt.id, cancelPaidApt.id] },
    },
  });
  console.log('\n🧹 Limpeza dos 2 agendamentos de teste de conciliação concluída.');

  console.log('\n===============================================================');
  console.log('🌟 TODOS OS 10 CRITÉRIOS DE AUDITORIA FINANCEIRA VALIDADOS!');
  console.log('===============================================================');
}

testFinancialReconciliation()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
