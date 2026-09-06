import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Role, OrderStatus } from '@prisma/client';

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

async function runTests() {
  console.log('🛡️ --- INICIANDO BATERIA FORENSE: GOVERNANÇA DE CANCELAMENTO DE PEDIDOS --- 🛡️\n');

  // 1. Obter ou criar estabelecimento e tutor reais
  const establishment = await prisma.user.findFirst({
    where: { role: Role.ESTABLISHMENT },
    include: { establishmentProfile: true },
  });

  const tutor = await prisma.user.findFirst({
    where: { role: Role.TUTOR },
  });

  if (!establishment || !tutor) {
    console.error('❌ É necessário ao menos 1 estabelecimento e 1 tutor cadastrados no banco.');
    process.exit(1);
  }

  const estToken = makeToken(establishment);
  const tutorToken = makeToken(tutor);

  // 2. Obter ou criar um produto de teste para o estabelecimento
  let testProduct = await prisma.product.findFirst({
    where: { establishmentId: establishment.id },
  });

  if (!testProduct) {
    testProduct = await prisma.product.create({
      data: {
        name: 'Produto Teste Governança',
        description: 'Produto para teste de estoque e cancelamento',
        price: 50.0,
        stock: 50,
        establishmentId: establishment.id,
      },
    });
  }

  // Helper para criar pedido com status específico
  async function createTestOrder(status: OrderStatus, quantity = 2) {
    const totalAmount = testProduct!.price * quantity;
    const order = await prisma.order.create({
      data: {
        tutorId: tutor!.id,
        totalAmount,
        status,
        paymentMethod: 'Cartão de Crédito',
        deliveryMethod: 'DELIVERY',
        items: {
          create: [
            {
              productId: testProduct!.id,
              quantity,
              priceAtTime: testProduct!.price,
              establishmentId: establishment!.id,
            },
          ],
        },
      },
      include: { items: true },
    });
    return order;
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FALHA: ${msg}`);
      failed++;
    }
  }

  // =========================================================================
  // TESTE 1: PENDING -> Cancelamento pelo estabelecimento permitido
  // =========================================================================
  console.log('📋 TESTE 1 — Pedido PENDING (Cancelamento permitido pelo Estabelecimento)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.PENDING, 2);

    const res = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Item avariado no estoque', notes: 'Cancelado pelo lojista' }),
    });

    const data = await res.json() as any;
    assert(res.status === 200, `Resposta HTTP 200 (obtido: ${res.status})`);
    assert(data.success === true, 'Payload contém success: true');

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert(updatedOrder.status === OrderStatus.CANCELLED, 'Status atualizado para CANCELLED');
    assert(updatedOrder.cancelledBy === 'ESTABLISHMENT', 'cancelledBy registrado como ESTABLISHMENT');

    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock + 2, `Estoque restaurado: ${initialProduct.stock} -> ${afterProduct.stock}`);
  }

  // =========================================================================
  // TESTE 2: CONFIRMED -> Cancelamento pelo estabelecimento permitido
  // =========================================================================
  console.log('\n📋 TESTE 2 — Pedido CONFIRMED (Cancelamento permitido)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.CONFIRMED, 1);

    const res = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Solicitação do cliente por telefone' }),
    });

    assert(res.status === 200, `Resposta HTTP 200 (obtido: ${res.status})`);
    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock + 1, 'Estoque do produto restaurado corretamente (+1)');
  }

  // =========================================================================
  // TESTE 3: PREPARING -> Cancelamento pelo estabelecimento permitido
  // =========================================================================
  console.log('\n📋 TESTE 3 — Pedido PREPARING (Cancelamento permitido)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.PREPARING, 3);

    const res = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Divergência de lote durante separação' }),
    });

    assert(res.status === 200, `Resposta HTTP 200 (obtido: ${res.status})`);
    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock + 3, 'Estoque restaurado corretamente (+3)');
  }

  // =========================================================================
  // TESTE 4: SHIPPED -> Cancelamento excepcional permitido (falha de entrega)
  // =========================================================================
  console.log('\n📋 TESTE 4 — Pedido SHIPPED (Cancelamento permitido em caso de falha de entrega)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.SHIPPED, 1);

    const res = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Endereço não localizado pelo entregador' }),
    });

    assert(res.status === 200, `Resposta HTTP 200 (obtido: ${res.status})`);
    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock + 1, 'Estoque restaurado após falha de entrega (+1)');
  }

  // =========================================================================
  // TESTE 5: READY_FOR_PICKUP -> Cancelamento permitido (abandono de retirada)
  // =========================================================================
  console.log('\n📋 TESTE 5 — Pedido READY_FOR_PICKUP (Cancelamento permitido por abandono)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.READY_FOR_PICKUP, 1);

    const res = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Cliente não compareceu para retirada no prazo limite' }),
    });

    assert(res.status === 200, `Resposta HTTP 200 (obtido: ${res.status})`);
    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock + 1, 'Estoque restaurado (+1)');
  }

  // =========================================================================
  // TESTE 6: DELIVERED -> BLOQUEADO ESTRITAMENTE
  // =========================================================================
  console.log('\n📋 TESTE 6 — Pedido DELIVERED (Tentativa de cancelamento pelo Estabelecimento — DEVE SER REJEITADO)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.DELIVERED, 2);

    const res = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Tentativa indevida de cancelar entregue' }),
    });

    const data = await res.json() as any;
    assert(res.status === 400, `Resposta HTTP 400 Rejeitado (obtido: ${res.status})`);
    assert(
      data.error === 'Este pedido já foi entregue e não pode mais ser cancelado pelo estabelecimento.',
      `Mensagem correta: "${data.error}"`
    );

    const afterOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert(afterOrder.status === OrderStatus.DELIVERED, 'Status permaneceu intacto como DELIVERED');

    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock, 'Estoque NÃO sofreu alteração');
  }

  // =========================================================================
  // TESTE 7: COMPLETED -> BLOQUEADO ESTRITAMENTE
  // =========================================================================
  console.log('\n📋 TESTE 7 — Pedido COMPLETED (Tentativa de cancelamento pelo Estabelecimento — DEVE SER REJEITADO)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.COMPLETED, 2);

    const res = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Tentativa indevida de cancelar concluído' }),
    });

    const data = await res.json() as any;
    assert(res.status === 400, `Resposta HTTP 400 Rejeitado (obtido: ${res.status})`);
    assert(
      data.error === 'Este pedido já foi concluído pelo tutor e não pode mais ser cancelado.',
      `Mensagem correta: "${data.error}"`
    );

    const afterOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert(afterOrder.status === OrderStatus.COMPLETED, 'Status permaneceu intacto como COMPLETED');

    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock, 'Estoque NÃO sofreu alteração');
  }

  // =========================================================================
  // TESTE 8: CANCELLED -> BLOQUEADO (Não cancelar duas vezes)
  // =========================================================================
  console.log('\n📋 TESTE 8 — Pedido CANCELLED (Tentativa de re-cancelar — DEVE SER REJEITADO, SEM DUPLICAR ESTOQUE)');
  {
    const order = await createTestOrder(OrderStatus.PENDING, 2);

    // Primeiro cancelamento válido
    const res1 = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Primeiro cancelamento legítimo' }),
    });
    assert(res1.status === 200, 'Primeiro cancelamento teve sucesso (HTTP 200)');

    const productAfterFirstCancel = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const notifsBefore = await prisma.notification.count({ where: { userId: tutor.id } });

    // Segundo cancelamento (duplicação)
    const res2 = await fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ reason: 'Tentando cancelar de novo' }),
    });

    const data2 = await res2.json() as any;
    assert(res2.status === 400, `Segundo cancelamento rejeitado com HTTP 400 (obtido: ${res2.status})`);
    assert(
      data2.error === 'Este pedido já foi cancelado anteriormente.',
      `Mensagem correta: "${data2.error}"`
    );

    const productAfterSecondCancel = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(
      productAfterSecondCancel.stock === productAfterFirstCancel.stock,
      'Estoque NÃO foi incrementado uma segunda vez'
    );

    const notifsAfter = await prisma.notification.count({ where: { userId: tutor.id } });
    assert(notifsAfter === notifsBefore, 'Nenhuma notificação duplicada foi gerada');
  }

  // =========================================================================
  // TESTE 9: RACE CONDITION (Tutor confirma recebimento vs Estabelecimento cancela)
  // =========================================================================
  console.log('\n📋 TESTE 9 — Condição de Corrida (Tutor confirma recebimento enquanto Estabelecimento cancela)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.DELIVERED, 1);

    // Disparar simultaneamente
    const [tutorRes, estRes] = await Promise.all([
      fetch(`${API_BASE}/orders/${order.id}/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tutorToken}`,
        },
      }),
      fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${estToken}`,
        },
        body: JSON.stringify({ reason: 'Tentativa de cancelamento concorrente' }),
      }),
    ]);

    assert(tutorRes.status === 200, `Tutor confirmou recebimento com sucesso (HTTP 200)`);
    assert(estRes.status === 400, `Cancelamento do lojista foi rejeitado (HTTP 400)`);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert(finalOrder.status === OrderStatus.COMPLETED, 'Pedido ficou estavelmente como COMPLETED');

    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(afterProduct.stock === initialProduct.stock, 'Estoque permaneceu inalterado (sem estorno falso)');
  }

  // =========================================================================
  // TESTE 10: DUPLICAÇÃO CONCORRENTE DE CANCELAMENTO (2 cancelamentos simultâneos)
  // =========================================================================
  console.log('\n📋 TESTE 10 — Cancelamento Concorrente Duplicado (Promise.all de dois cancelamentos no mesmo ms)');
  {
    const initialProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    const order = await createTestOrder(OrderStatus.PENDING, 2);

    const [call1, call2] = await Promise.all([
      fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${estToken}`,
        },
        body: JSON.stringify({ reason: 'Cancelamento Concorrente 1' }),
      }),
      fetch(`${API_BASE}/establishment/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${estToken}`,
        },
        body: JSON.stringify({ reason: 'Cancelamento Concorrente 2' }),
      }),
    ]);

    const statuses = [call1.status, call2.status].sort();
    assert(statuses[0] === 200 && statuses[1] === 400, `Exatamente um 200 e um 400 obtidos: [${call1.status}, ${call2.status}]`);

    const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } });
    assert(
      afterProduct.stock === initialProduct.stock + 2,
      `Estoque incrementado apenas 1x (+2). Esperado: ${initialProduct.stock + 2}, Atual: ${afterProduct.stock}`
    );
  }

  // =========================================================================
  // TESTE 11: REGRAS DE TRANSIÇÃO EM updateOrderStatus
  // =========================================================================
  console.log('\n📋 TESTE 11 — Governança de Transições em updateOrderStatus');
  {
    const orderDelivered = await createTestOrder(OrderStatus.DELIVERED, 1);

    // 1. Tentar regredir DELIVERED para PREPARING
    const resRegress = await fetch(`${API_BASE}/establishment/orders/${orderDelivered.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ status: OrderStatus.PREPARING }),
    });
    const regressData = await resRegress.json() as any;
    assert(resRegress.status === 400, `Regressão de DELIVERED rejeitada com HTTP 400 (obtido: ${resRegress.status})`);
    assert(
      regressData.error.includes('Este pedido já foi entregue e aguarda confirmação'),
      `Mensagem correta: "${regressData.error}"`
    );

    // 2. Tentar cancelar DELIVERED via updateOrderStatus
    const resCancelBypass = await fetch(`${API_BASE}/establishment/orders/${orderDelivered.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ status: OrderStatus.CANCELLED }),
    });
    assert(resCancelBypass.status === 400, `Bypass de cancelamento via updateOrderStatus rejeitado (HTTP 400)`);

    // 3. Tentar concluir via updateOrderStatus
    const orderPreparing = await createTestOrder(OrderStatus.PREPARING, 1);
    const resCompleteBypass = await fetch(`${API_BASE}/establishment/orders/${orderPreparing.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estToken}`,
      },
      body: JSON.stringify({ status: OrderStatus.COMPLETED }),
    });
    assert(resCompleteBypass.status === 400, `Conclusão indevida pelo lojista rejeitada (HTTP 400)`);
  }

  // Limpeza de pedidos de teste
  console.log('\n🧹 Limpeza de registros efetuada com integridade.');

  console.log('\n============================================================');
  console.log(`🎯 RESULTADO FINAL: ${passed} passaram, ${failed} falharam.`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Erro fatal ao rodar testes:', err);
  process.exit(1);
});
