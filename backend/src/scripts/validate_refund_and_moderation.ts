import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Role, OrderStatus, ReportTargetType } from '@prisma/client';

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

async function runValidation() {
  console.log('====================================================');
  console.log('🧪 VALIDAÇÃO INTEGRADA: DENÚNCIAS, AVALIAÇÕES E REEMBOLSOS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Carregar atores reais do sistema
  const tutor = await prisma.user.findFirst({
    where: { role: Role.TUTOR },
  });
  const otherTutor = await prisma.user.findFirst({
    where: { role: Role.TUTOR, NOT: { id: tutor?.id } },
  });
  const establishment = await prisma.user.findFirst({
    where: { role: Role.ESTABLISHMENT },
    include: { establishmentProfile: true },
  });
  const professional = await prisma.user.findFirst({
    where: { role: Role.PROFESSIONAL },
  });

  if (!tutor || !establishment || !professional) {
    console.error('❌ Base de dados necessita de ao menos um tutor, estabelecimento e profissional.');
    process.exit(1);
  }

  const tutorToken = makeToken(tutor);
  const otherTutorToken = otherTutor ? makeToken(otherTutor) : tutorToken;
  const estToken = makeToken(establishment);
  const profToken = makeToken(professional);

  console.log(`👤 Tutor: ${tutor.name} (${tutor.id})`);
  console.log(`🏢 Estabelecimento: ${establishment.name} (${establishment.id})`);
  console.log(`✂️ Profissional: ${professional.name} (${professional.id})`);

  // Obter ou criar produto de teste
  let testProduct = await prisma.product.findFirst({
    where: { establishmentId: establishment.id },
  });
  if (!testProduct) {
    testProduct = await prisma.product.create({
      data: {
        name: 'Produto Teste QA Reembolso',
        description: 'Produto para testes automatizados de reembolso e avaliação',
        price: 89.90,
        stock: 50,
        establishmentId: establishment.id,
      },
    });
  }

  // =========================================================================
  // BLOCO 1: DENÚNCIAS CONTEXTUAIS (4 PERSONAS)
  // =========================================================================
  console.log('\n--- BLOCO 1: Denúncias Contextuais (4 Personas) ---');

  // 1.1 Tutor -> Estabelecimento
  const estabProfileId = establishment.establishmentProfile?.id || establishment.id;
  const resReport1 = await fetch(`${API_BASE}/reports/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      targetType: ReportTargetType.ESTABLISHMENT,
      reportedEstablishmentId: estabProfileId,
      reason: 'Produto com embalagem violada ou não entregue',
      description: 'Recebi o produto com sinais claros de avaria.',
      contextType: 'ORDER',
      contextId: 'ORD-TEST-CONTEXT-01',
    }),
  });
  const dataReport1 = await resReport1.json();
  assert(resReport1.ok, '1.1 Tutor denuncia Estabelecimento com contexto de Pedido');
  const reportInDb1 = await prisma.moderationReport.findUnique({
    where: { id: dataReport1.reportId },
  });
  assert(
    reportInDb1?.description?.includes('[Contexto: ORDER #ORD-TEST-CONTEXT-01]') || false,
    '1.1 Descrição contém tag de auditoria de contexto do Pedido'
  );

  // 1.2 Tutor -> Profissional
  const resReport2 = await fetch(`${API_BASE}/reports/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      targetType: ReportTargetType.PROFESSIONAL,
      reportedUserId: professional.id,
      reason: 'Atraso e conduta inadequada no atendimento domiciliar',
      description: 'Profissional chegou com 1 hora de atraso.',
      contextType: 'APPOINTMENT',
      contextId: 'APT-TEST-CONTEXT-02',
    }),
  });
  const dataReport2 = await resReport2.json();
  assert(resReport2.ok, '1.2 Tutor denuncia Profissional com contexto de Agendamento');
  const reportInDb2 = await prisma.moderationReport.findUnique({
    where: { id: dataReport2.reportId },
  });
  assert(
    reportInDb2?.description?.includes('[Contexto: APPOINTMENT #APT-TEST-CONTEXT-02]') || false,
    '1.2 Descrição contém tag de auditoria de contexto do Agendamento'
  );

  // 1.3 Estabelecimento -> Tutor
  const resReport3 = await fetch(`${API_BASE}/reports/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${estToken}`,
    },
    body: JSON.stringify({
      targetType: ReportTargetType.USER,
      reportedUserId: tutor.id,
      reason: 'Comportamento abusivo e desrespeitoso na retirada de produto',
      description: 'Cliente desrespeitou os funcionários no balcão.',
      contextType: 'ORDER',
      contextId: 'ORD-TEST-CONTEXT-03',
    }),
  });
  const dataReport3 = await resReport3.json();
  assert(resReport3.ok, '1.3 Estabelecimento denuncia Tutor / Cliente');
  const reportInDb3 = await prisma.moderationReport.findUnique({
    where: { id: dataReport3.reportId },
  });
  assert(
    reportInDb3?.description?.includes('[Contexto: ORDER #ORD-TEST-CONTEXT-03]') || false,
    '1.3 Descrição de denúncia de Tutor preserva contexto'
  );

  // 1.4 Profissional -> Tutor
  const resReport4 = await fetch(`${API_BASE}/reports/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${profToken}`,
    },
    body: JSON.stringify({
      targetType: ReportTargetType.USER,
      reportedUserId: tutor.id,
      reason: 'Não comparecimento e animal agressivo sem aviso prévio',
      description: 'Tutor não informou que o animal necessitava de focinheira.',
      contextType: 'APPOINTMENT',
      contextId: 'APT-TEST-CONTEXT-04',
    }),
  });
  const dataReport4 = await resReport4.json();
  assert(resReport4.ok, '1.4 Profissional denuncia Tutor');
  assert(resReport4.status === 201, '1.4 Código de retorno 201 Created para denúncia');

  // =========================================================================
  // BLOCO 2: AVALIAÇÃO PÓS-COMPRA DE PEDIDO
  // =========================================================================
  console.log('\n--- BLOCO 2: Avaliações Pós-Compra de Pedido ---');

  // Criar um pedido entregue para o tutor
  const deliveredOrder = await prisma.order.create({
    data: {
      tutorId: tutor.id,
      totalAmount: 150.0,
      status: OrderStatus.DELIVERED,
      paymentMethod: 'Cartão de Crédito',
      deliveryMethod: 'DELIVERY',
      items: {
        create: [
          {
            productId: testProduct.id,
            quantity: 2,
            priceAtTime: 75.0,
            establishmentId: establishment.id,
          },
        ],
      },
    },
  });

  // Criar um pedido em andamento (PENDING) para testar bloqueio
  const pendingOrder = await prisma.order.create({
    data: {
      tutorId: tutor.id,
      totalAmount: 90.0,
      status: OrderStatus.PENDING,
      paymentMethod: 'PIX',
      deliveryMethod: 'PICKUP',
      items: {
        create: [
          {
            productId: testProduct.id,
            quantity: 1,
            priceAtTime: 90.0,
            establishmentId: establishment.id,
          },
        ],
      },
    },
  });

  // 2.1 Tutor avalia o pedido entregue com sucesso
  const resReviewSuccess = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      orderId: deliveredOrder.id,
      rating: 5,
      comment: 'Entrega super rápida e ração de excelente qualidade!',
    }),
  });
  const dataReviewSuccess = await resReviewSuccess.json();
  assert(resReviewSuccess.ok, '2.1 Tutor avalia pedido entregue com sucesso');
  assert(dataReviewSuccess.review?.rating === 5, '2.1 Nota da avaliação registrada como 5 estrelas');
  assert(dataReviewSuccess.review?.orderId === deliveredOrder.id, '2.1 Avaliação vinculada ao orderId correto');

  // 2.2 Impedir duplicação de avaliação no mesmo pedido
  const resReviewDuplicate = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      orderId: deliveredOrder.id,
      rating: 4,
      comment: 'Tentando avaliar novamente...',
    }),
  });
  assert(
    resReviewDuplicate.status === 409 || resReviewDuplicate.status === 400,
    `2.2 Duplicação de avaliação no mesmo pedido é rejeitada (${resReviewDuplicate.status})`
  );

  // 2.3 Impedir avaliação em pedido não entregue (PENDING)
  const resReviewPending = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      orderId: pendingOrder.id,
      rating: 3,
      comment: 'Pedido ainda não chegou...',
    }),
  });
  assert(resReviewPending.status === 400, '2.3 Avaliação de pedido PENDING bloqueada (400)');

  // 2.4 Impedir outro tutor de avaliar pedido alheio
  if (otherTutor && otherTutorToken !== tutorToken) {
    const resReviewUnauthorized = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherTutorToken}`,
      },
      body: JSON.stringify({
        orderId: deliveredOrder.id,
        rating: 1,
        comment: 'Avaliando pedido que não é meu...',
      }),
    });
    assert(resReviewUnauthorized.status === 403 || resReviewUnauthorized.status === 404, '2.4 Tutor alheio não pode avaliar pedido de terceiro');
  }

  // 2.5 Verificar endpoint de elegibilidade
  const resEligible = await fetch(`${API_BASE}/reviews/eligibility?establishmentId=${establishment.id}`, {
    headers: {
      Authorization: `Bearer ${tutorToken}`,
    },
  });
  const dataEligible = await resEligible.json();
  assert(resEligible.ok, '2.5 Consulta de elegibilidade de avaliação');
  const deliveredInOrders = Array.isArray(dataEligible.eligibleOrders) && dataEligible.eligibleOrders.find((o: any) => o.id === deliveredOrder.id);
  assert(
    deliveredInOrders && deliveredInOrders.alreadyReviewed === true,
    '2.5 Pedido avaliado marcado com alreadyReviewed: true na consulta de elegibilidade'
  );

  // =========================================================================
  // BLOCO 3: CANCELAMENTO DE PEDIDO E REEMBOLSO SIMULADO
  // =========================================================================
  console.log('\n--- BLOCO 3: Cancelamento de Pedido e Reembolso Demonstrativo ---');

  // Ler estoque inicial do produto
  const initialProduct = await prisma.product.findUnique({
    where: { id: testProduct.id },
  });
  const initialStock = initialProduct!.stock;

  // Criar pedido elegível para cancelamento (PAID)
  const orderQuantity = 3;
  const orderUnitCost = testProduct.price;
  const totalOrderAmount = orderUnitCost * orderQuantity;

  // Atualizar estoque para simular a baixa na compra
  await prisma.product.update({
    where: { id: testProduct.id },
    data: { stock: { decrement: orderQuantity } },
  });

  const cancellableOrder = await prisma.order.create({
    data: {
      tutorId: tutor.id,
      totalAmount: totalOrderAmount,
      status: OrderStatus.PAID,
      paymentMethod: 'Cartão de Crédito',
      deliveryMethod: 'DELIVERY',
      items: {
        create: [
          {
            productId: testProduct.id,
            quantity: orderQuantity,
            priceAtTime: orderUnitCost,
            establishmentId: establishment.id,
          },
        ],
      },
    },
  });

  // 3.1 Tutor solicita cancelamento do pedido
  const resCancel = await fetch(`${API_BASE}/orders/${cancellableOrder.id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      reason: 'Desistência da compra pelo cliente',
    }),
  });
  const dataCancel = await resCancel.json();
  assert(resCancel.ok, '3.1 Tutor solicita cancelamento de pedido PAID');
  assert(dataCancel.order?.status === OrderStatus.CANCELLED, '3.1 Status do pedido atualizado para CANCELLED');
  assert(dataCancel.order?.refundStatus === 'REFUNDED', '3.1 Metadado refundStatus é REFUNDED');
  assert(
    Math.abs(Number(dataCancel.order?.refundAmount) - totalOrderAmount) < 0.01,
    '3.1 Valor de estorno bate exatamente com o total do pedido'
  );
  assert(dataCancel.order?.refundMethod !== null, '3.1 Método de estorno demonstrativo registrado');
  assert(dataCancel.order?.refundedAt !== null, '3.1 refundedAt preenchido');

  // 3.2 Verificar reposição de estoque no banco
  const productAfterCancel = await prisma.product.findUnique({
    where: { id: testProduct.id },
  });
  assert(
    productAfterCancel!.stock === initialStock,
    `3.2 Estoque restaurado exatamente para o valor original (${initialStock})`
  );

  // 3.3 Teste de Idempotência: Tentar cancelar o mesmo pedido novamente
  const resCancelDuplicate = await fetch(`${API_BASE}/orders/${cancellableOrder.id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      reason: 'Tentando cancelar de novo',
    }),
  });
  assert(
    resCancelDuplicate.status === 400,
    '3.3 Re-tentativa de cancelamento em pedido já cancelado é rejeitada (400)'
  );

  // Verificar que o estoque NÃO foi estornado novamente
  const productAfterDuplicate = await prisma.product.findUnique({
    where: { id: testProduct.id },
  });
  assert(
    productAfterDuplicate!.stock === initialStock,
    '3.3 Estoque mantido íntegro sem duplicação de estorno'
  );

  // 3.4 Bloquear cancelamento de pedido já enviado (SHIPPED)
  const shippedOrder = await prisma.order.create({
    data: {
      tutorId: tutor.id,
      totalAmount: 60.0,
      status: OrderStatus.SHIPPED,
      paymentMethod: 'PIX',
      deliveryMethod: 'DELIVERY',
      items: {
        create: [
          {
            productId: testProduct.id,
            quantity: 1,
            priceAtTime: 60.0,
            establishmentId: establishment.id,
          },
        ],
      },
    },
  });

  const resCancelShipped = await fetch(`${API_BASE}/orders/${shippedOrder.id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tutorToken}`,
    },
    body: JSON.stringify({
      reason: 'Quero cancelar o pedido já enviado',
    }),
  });
  assert(
    resCancelShipped.status === 400,
    '3.4 Cancelamento de pedido em trânsito (SHIPPED) bloqueado com 400'
  );

  // =========================================================================
  // BLOCO 4: REFLEXO FINANCEIRO CONSISTENTE (DASHBOARD & PDF)
  // =========================================================================
  console.log('\n--- BLOCO 4: Reflexo Financeiro no Dashboard e Relatórios ---');

  // 4.1 Dashboard do Estabelecimento
  const resDashboard = await fetch(`${API_BASE}/establishment/dashboard`, {
    headers: {
      Authorization: `Bearer ${estToken}`,
    },
  });
  const dataDashboard = await resDashboard.json();
  assert(resDashboard.ok, '4.1 Dashboard do estabelecimento carregado com sucesso');
  assert(dataDashboard.financialSummary !== undefined, '4.1 Dashboard contém resumo financeiro');
  assert(dataDashboard.cancellations !== undefined, '4.1 Dashboard contém métricas de cancelamentos');

  const grossRev = dataDashboard.grossRevenue ?? 0;
  const netRev = dataDashboard.netRevenue ?? 0;
  const refundedAmt = dataDashboard.totalRefundedAmount ?? 0;

  console.log(`   📊 Dashboard: Bruto = R$ ${grossRev.toFixed(2)} | Estornos = R$ ${refundedAmt.toFixed(2)} | Líquido = R$ ${netRev.toFixed(2)}`);
  assert(
    Math.abs(grossRev - refundedAmt - netRev) < 0.01,
    '4.1 Equação financeira do Dashboard bate ao centavo: Bruto - Estornos = Líquido'
  );

  // 4.2 Endpoint de Relatórios Financeiros do Estabelecimento
  const resFinancialReport = await fetch(`${API_BASE}/reports/establishment/financial`, {
    headers: {
      Authorization: `Bearer ${estToken}`,
    },
  });
  const dataFinancialReport = await resFinancialReport.json();
  assert(resFinancialReport.ok, '4.2 Relatório financeiro do estabelecimento carregado com sucesso');
  assert(dataFinancialReport.summary?.refunds !== undefined, '4.2 Relatório contém nó de estornos/reembolsos');

  const repGross = dataFinancialReport.summary?.totalGrossRevenue ?? 0;
  const repNet = dataFinancialReport.summary?.netRevenue ?? 0;
  const repRefunds = dataFinancialReport.summary?.totalRefundedAmount ?? 0;

  console.log(`   📈 Relatórios: Bruto = R$ ${repGross.toFixed(2)} | Estornos = R$ ${repRefunds.toFixed(2)} | Líquido = R$ ${repNet.toFixed(2)}`);
  assert(
    Math.abs(repGross - repRefunds - repNet) < 0.01,
    '4.2 Equação financeira do Relatório bate ao centavo: Bruto - Estornos = Líquido'
  );

  // 4.3 Exportação Oficial em PDF com Estornos
  const resPdf = await fetch(`${API_BASE}/reports/establishment/export?type=financial&format=pdf`, {
    headers: {
      Authorization: `Bearer ${estToken}`,
    },
  });
  assert(resPdf.ok, '4.3 Geração de PDF oficial do relatório financeiro');
  const pdfBuffer = Buffer.from(await resPdf.arrayBuffer());
  const isPdfHeader = pdfBuffer.slice(0, 4).toString() === '%PDF';
  assert(isPdfHeader, '4.3 Assinatura binária do PDF válida (%PDF)');
  assert(pdfBuffer.length > 2000, `4.3 Tamanho do arquivo PDF gerado consistente (${pdfBuffer.length} bytes)`);

  // =========================================================================
  // RESULTADOS FINAIS
  // =========================================================================
  console.log('\n====================================================');
  console.log(`🏁 RESULTADO DA BATERIA: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runValidation()
  .catch((err) => {
    console.error('💥 Erro fatal durante a execução dos testes:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
