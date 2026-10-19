import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Role, AppointmentStatus } from '@prisma/client';

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-fallback';

function base64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeToken(user: { id: string; email: string; role: Role }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

async function runFinancialAuditTests() {
  console.log('========================================================================');
  console.log('AUDITORIA DE ESTADOS: DESACOPLAMENTO OPERACIONAL E CONCILIAÇÃO FINANCEIRA');
  console.log('========================================================================\n');

  const establishment = await prisma.user.findFirst({
    where: { email: 'pethub@gmail.com', role: Role.ESTABLISHMENT },
    include: { establishmentProfile: true },
  });

  const tutor = await prisma.user.findFirst({
    where: { email: 'user1@gmail.com', role: Role.TUTOR },
    include: { pets: true },
  });

  if (!establishment || !establishment.establishmentProfile || !tutor || tutor.pets.length === 0) {
    console.error('Dados de teste necessários não encontrados no banco de dados.');
    process.exit(1);
  }

  // Obter um serviço existente do estabelecimento
  const service = await prisma.service.findFirst({
    where: { establishmentId: establishment.id, active: true },
  });

  if (!service) {
    console.error('Nenhum serviço ativo encontrado para o estabelecimento.');
    process.exit(1);
  }

  const tokenEst = makeToken(establishment);
  const tokenTutor = makeToken(tutor);

  let passed = 0;
  let failed = 0;

  async function assertCase(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      } else {
        console.log(`  ❌ [FAIL] ${name}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`  ❌ [ERROR] ${name}: ${err.message}`);
      failed++;
    }
  }

  const testPet = tutor.pets[0];
  const testAptPrice = 120.00;
  let testApt1Id: string = '';
  let testApt2Id: string = '';
  let testApt3Id: string = '';

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: Criar agendamento com forma de pagamento Cartão de Crédito
    // -------------------------------------------------------------------------
    await assertCase('1. Criar agendamento: Operational=PENDING, Financial=PENDING, Method preservado', async () => {
      const created = await prisma.appointment.create({
        data: {
          tutorId: tutor.id,
          petId: testPet.id,
          serviceId: service.id,
          establishmentId: establishment.id,
          date: new Date(),
          totalAmount: testAptPrice,
          finalAmount: testAptPrice,
          paymentMethod: 'CREDIT_CARD',
          paymentStatus: 'PENDING',
          status: AppointmentStatus.PENDING,
        },
      });
      testApt1Id = created.id;

      return (
        created.status === AppointmentStatus.PENDING &&
        created.paymentStatus === 'PENDING' &&
        created.paymentMethod === 'CREDIT_CARD'
      );
    });

    // -------------------------------------------------------------------------
    // TESTE 2: Concluir agendamento NÃO deve alterar paymentStatus para PAID
    // -------------------------------------------------------------------------
    await assertCase('2. Concluir agendamento (COMPLETED) mantém estritamente paymentStatus=PENDING', async () => {
      const res = await fetch(`${API_BASE}/establishment/appointments/${testApt1Id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenEst}`,
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (!res.ok) {
        console.error('Erro ao atualizar status para COMPLETED:', await res.text());
        return false;
      }

      const updated = await prisma.appointment.findUnique({ where: { id: testApt1Id } });
      return updated?.status === AppointmentStatus.COMPLETED && updated?.paymentStatus === 'PENDING';
    });

    // -------------------------------------------------------------------------
    // TESTE 3: Relatório Financeiro NÃO contabiliza serviço concluído com pagamento pendente como caixa realizado
    // -------------------------------------------------------------------------
    await assertCase('3. Relatório financeiro separa Contas a Receber (PENDENTE) do Caixa Realizado (PAID)', async () => {
      const todayIso = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/reports/establishment/financial?startDate=${todayIso}&endDate=${todayIso}`, {
        headers: { Authorization: `Bearer ${tokenEst}` },
      });

      if (!res.ok) {
        console.error('Erro ao buscar relatório:', await res.text());
        return false;
      }

      const data = await res.json();

      const hasPendingReceivables = data.summary.pendingPaymentsCount >= 1;
      const pendingServicesValue = Number(data.summary.pendingPaymentsServices || 0);

      const tx = data.transactions.find((t: any) => t.id === testApt1Id);
      const isPendingTx = tx && tx.type === 'SERVICO_PENDENTE';

      return hasPendingReceivables && pendingServicesValue >= testAptPrice && !!isPendingTx;
    });

    // -------------------------------------------------------------------------
    // TESTE 4: Registrar pagamento explícito via endpoint autorizado
    // -------------------------------------------------------------------------
    await assertCase('4. Registrar pagamento presencial/confirmado via endpoint autorizado de pagamentos', async () => {
      const res = await fetch(`${API_BASE}/establishment/appointments/${testApt1Id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenEst}`,
        },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });

      if (!res.ok) {
        console.error('Erro ao registrar pagamento:', await res.text());
        return false;
      }

      const json = await res.json();
      const updated = await prisma.appointment.findUnique({ where: { id: testApt1Id } });

      return (
        json.appointment?.paymentStatus === 'PAID' &&
        updated?.paymentStatus === 'PAID' &&
        updated?.paymentMethod === 'CREDIT_CARD' // Forma original preservada
      );
    });

    // -------------------------------------------------------------------------
    // TESTE 5: Relatório financeiro agora contabiliza o valor no caixa e breakdown
    // -------------------------------------------------------------------------
    await assertCase('5. Relatório financeiro contabiliza o valor em faturamento realizado e breakdown', async () => {
      const todayIso = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/reports/establishment/financial?startDate=${todayIso}&endDate=${todayIso}`, {
        headers: { Authorization: `Bearer ${tokenEst}` },
      });

      const data = await res.json();
      const grossRevenue = Number(data.summary.grossRevenueServices || 0);
      const cardBreakdown = Number(data.paymentMethodBreakdown.CREDIT_CARD || 0);
      const tx = data.transactions.find((t: any) => t.id === testApt1Id);

      return (
        grossRevenue >= testAptPrice &&
        cardBreakdown >= testAptPrice &&
        tx &&
        tx.type === 'SERVICO'
      );
    });

    // -------------------------------------------------------------------------
    // TESTE 6: Cancelar agendamento pré-pago transiciona paymentStatus para REFUNDED (Estorno)
    // -------------------------------------------------------------------------
    await assertCase('6. Cancelar agendamento já PAGO transiciona paymentStatus para REFUNDED (Estorno)', async () => {
      // Criar agendamento que foi pago antecipadamente
      const aptPaid = await prisma.appointment.create({
        data: {
          tutorId: tutor.id,
          petId: testPet.id,
          serviceId: service.id,
          establishmentId: establishment.id,
          date: new Date(),
          totalAmount: 95.00,
          finalAmount: 95.00,
          paymentMethod: 'PIX',
          paymentStatus: 'PAID',
          status: AppointmentStatus.CONFIRMED,
        },
      });
      testApt2Id = aptPaid.id;

      const res = await fetch(`${API_BASE}/establishment/appointments/${testApt2Id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenEst}`,
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (!res.ok) {
        console.error('Erro ao cancelar agendamento pago:', await res.text());
        return false;
      }

      const updated = await prisma.appointment.findUnique({ where: { id: testApt2Id } });

      return (
        updated?.status === AppointmentStatus.CANCELLED &&
        updated?.paymentStatus === 'REFUNDED'
      );
    });

    // -------------------------------------------------------------------------
    // TESTE 7: Relatório financeiro contabiliza estorno de serviço e deduz do faturamento líquido
    // -------------------------------------------------------------------------
    await assertCase('7. Relatório reflete estorno (refundsServices > 0) e discrimina transação como ESTORNO', async () => {
      const todayIso = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/reports/establishment/financial?startDate=${todayIso}&endDate=${todayIso}`, {
        headers: { Authorization: `Bearer ${tokenEst}` },
      });

      const data = await res.json();
      const refundsServices = Number(data.summary.refundsServices || 0);
      const totalRefunds = Number(data.summary.refunds || 0);
      const tx = data.transactions.find((t: any) => t.id === testApt2Id || t.id.includes(testApt2Id));

      return (
        refundsServices >= 95.00 &&
        totalRefunds >= 95.00 &&
        tx &&
        tx.type === 'ESTORNO'
      );
    });

    // -------------------------------------------------------------------------
    // TESTE 8: Cancelar agendamento NÃO PAGO deve marcar CANCELLED sem estorno indevido
    // -------------------------------------------------------------------------
    await assertCase('8. Cancelar agendamento NÃO PAGO transiciona paymentStatus para CANCELLED (sem estorno)', async () => {
      const aptUnpaid = await prisma.appointment.create({
        data: {
          tutorId: tutor.id,
          petId: testPet.id,
          serviceId: service.id,
          establishmentId: establishment.id,
          date: new Date(),
          totalAmount: 80.00,
          finalAmount: 80.00,
          paymentMethod: 'PIX',
          paymentStatus: 'PENDING',
          status: AppointmentStatus.PENDING,
        },
      });
      testApt3Id = aptUnpaid.id;

      const res = await fetch(`${API_BASE}/establishment/appointments/${testApt3Id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenEst}`,
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const updated = await prisma.appointment.findUnique({ where: { id: testApt3Id } });

      return (
        updated?.status === AppointmentStatus.CANCELLED &&
        updated?.paymentStatus === 'CANCELLED'
      );
    });

    // -------------------------------------------------------------------------
    // TESTE 9: Procedimento explícito de estorno em atendimento concluído via endpoint de pagamentos
    // -------------------------------------------------------------------------
    await assertCase('9. Estorno explícito autorizado em atendimento concluído via endpoint de pagamento', async () => {
      const res = await fetch(`${API_BASE}/establishment/appointments/${testApt1Id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenEst}`,
        },
        body: JSON.stringify({ paymentStatus: 'REFUNDED' }),
      });

      if (!res.ok) {
        console.error('Erro ao registrar estorno:', await res.text());
        return false;
      }

      const updated = await prisma.appointment.findUnique({ where: { id: testApt1Id } });

      return (
        updated?.status === AppointmentStatus.COMPLETED &&
        updated?.paymentStatus === 'REFUNDED'
      );
    });

  } finally {
    // Limpeza seletiva estrita apenas dos registros criados pelo teste automatizado
    console.log('\n🧹 Limpando dados criados pelo teste de conciliação...');
    if (testApt1Id) {
      await prisma.appointment.delete({ where: { id: testApt1Id } }).catch(() => {});
    }
    if (testApt2Id) {
      await prisma.appointment.delete({ where: { id: testApt2Id } }).catch(() => {});
    }
    if (testApt3Id) {
      await prisma.appointment.delete({ where: { id: testApt3Id } }).catch(() => {});
    }
    console.log('✅ Base de dados mantida íntegra.');
  }

  console.log('\n========================================================================');
  console.log(`RESULTADO FINAL DA AUDITORIA: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinancialAuditTests().catch((err) => {
  console.error('Erro na execução da suíte:', err);
  process.exit(1);
});
