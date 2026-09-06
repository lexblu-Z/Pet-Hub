import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function runForensicAudit() {
  console.log('====================================================');
  console.log('🔬 FORENSIC QA AUDIT — AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const auditReport: { [key: string]: 'PASS' | 'FAIL' | 'BLOCKED' } = {};

  // ----------------------------------------------------
  // TEST 1: Registration Validation (Ourinhos/SP)
  // ----------------------------------------------------
  console.log('--- TEST 1: Registration Validation (Ourinhos/SP) ---');
  
  // 1a. Missing address fields for TUTOR
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Tutor Sem Endereco',
      email: `tutor_no_addr_${Date.now()}@pethub.test`,
      password: 'Password123!',
      role: 'TUTOR',
      phone: '(14) 99999-1111',
    });
    auditReport['Tutor Registration without address'] = 'FAIL';
    console.log('❌ FAIL: Allowed registration without address.');
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error?.toLowerCase().includes('endereço completo')) {
      auditReport['Tutor Registration without address'] = 'PASS';
      console.log('✅ PASS: Rejected tutor registration without address (400).');
    } else {
      console.log('❌ FAIL: Unexpected error:', err.response?.data);
      auditReport['Tutor Registration without address'] = 'FAIL';
    }
  }

  // 1b. Address outside Ourinhos/SP (e.g. Marília/SP)
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Tutor Fora de Ourinhos',
      email: `tutor_marilia_${Date.now()}@pethub.test`,
      password: 'Password123!',
      role: 'TUTOR',
      phone: '(14) 99999-2222',
      address: 'Avenida Sampaio Vidal',
      number: '500',
      neighborhood: 'Centro',
      city: 'Marília',
      state: 'SP',
      zipCode: '17500-000',
    });
    auditReport['Tutor Registration outside Ourinhos'] = 'FAIL';
    console.log('❌ FAIL: Allowed registration outside Ourinhos/SP.');
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error?.includes('Ourinhos')) {
      auditReport['Tutor Registration outside Ourinhos'] = 'PASS';
      console.log('✅ PASS: Rejected tutor registration outside Ourinhos/SP (400).');
    } else {
      console.log('❌ FAIL: Unexpected response for non-Ourinhos:', err.response?.data);
      auditReport['Tutor Registration outside Ourinhos'] = 'FAIL';
    }
  }

  // 1c. Valid Tutor Registration in Ourinhos/SP
  const validTutorEmail = `tutor_ourinhos_${Date.now()}@pethub.test`;
  const tutorPassword = 'Password123!';
  let tutorToken = '';
  let tutorUser: any = null;

  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Tutor Ourinhos Real',
      email: validTutorEmail,
      password: tutorPassword,
      role: 'TUTOR',
      phone: '(14) 99876-5432',
      address: 'Rua Paraná',
      number: '450',
      complement: 'Casa',
      neighborhood: 'Centro',
      city: 'Ourinhos',
      state: 'SP',
      zipCode: '19900-000',
    });
    tutorToken = res.data.token;
    tutorUser = res.data.user;

    if (
      tutorUser.city === 'Ourinhos' &&
      tutorUser.state === 'SP' &&
      tutorUser.zipCode === '19900-000' &&
      tutorUser.address === 'Rua Paraná'
    ) {
      auditReport['Tutor Valid Registration in Ourinhos'] = 'PASS';
      console.log('✅ PASS: Valid tutor registered with full address in Ourinhos/SP.');
    } else {
      auditReport['Tutor Valid Registration in Ourinhos'] = 'FAIL';
      console.log('❌ FAIL: Returned user does not have address fields.');
    }
  } catch (err: any) {
    console.log('❌ FAIL: Registration error:', err.response?.data);
    auditReport['Tutor Valid Registration in Ourinhos'] = 'FAIL';
  }

  // 1d. Login & Address Persistence
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: validTutorEmail,
      password: tutorPassword,
    });
    const loggedUser = loginRes.data.user;
    if (loggedUser.city === 'Ourinhos' && loggedUser.address === 'Rua Paraná') {
      auditReport['Login returns persisted address'] = 'PASS';
      console.log('✅ PASS: Login returns persisted address fields.');
    } else {
      auditReport['Login returns persisted address'] = 'FAIL';
      console.log('❌ FAIL: Login did not return address fields.');
    }
  } catch (err: any) {
    console.log('❌ FAIL: Login error:', err.response?.data);
    auditReport['Login returns persisted address'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST 2: Product Setup & Cart vs "Comprar Agora"
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Cart vs Comprar Agora Isolation & Stock ---');
  const establishment = await prisma.establishmentProfile.findFirst({
    include: { user: true },
  });
  if (!establishment) throw new Error('No establishment found.');

  const prodA = await prisma.product.create({
    data: {
      name: 'QA Produto A (No Carrinho)',
      description: 'Item para ficar no carrinho',
      price: 50.00,
      stock: 10,
      establishmentId: establishment.userId,
    },
  });

  const prodB = await prisma.product.create({
    data: {
      name: 'QA Produto B (Comprar Agora)',
      description: 'Item para compra direta isolada',
      price: 99.80,
      stock: 10,
      establishmentId: establishment.userId,
    },
  });

  // Put Product A into Cart in database
  await prisma.cartItem.create({
    data: {
      tutorId: tutorUser.id,
      productId: prodA.id,
      quantity: 1,
    },
  });

  // Verify Cart has Product A
  const cartItemsBefore = await prisma.cartItem.findMany({
    where: { tutorId: tutorUser.id },
  });
  console.log(`Tutor cart contains ${cartItemsBefore.length} items (Produto A).`);

  // Direct Purchase of Product B via Order creation
  // Cash payment: Total R$ 99.80
  // Test Change: changeFor = 50.00 -> Should fail (less than total)
  console.log('\n--- TEST 3: Payment & Change Validation (R$ 99.80) ---');
  try {
    await axios.post(
      `${BASE_URL}/orders`,
      {
        items: [{ productId: prodB.id, quantity: 1 }],
        paymentMethod: 'Dinheiro (Pagamento na Entrega)',
        deliveryMethod: 'DELIVERY',
        deliveryAddress: {
          street: tutorUser.address,
          number: tutorUser.number,
          complement: tutorUser.complement,
          neighborhood: tutorUser.neighborhood,
          city: tutorUser.city,
          state: tutorUser.state,
          zipCode: tutorUser.zipCode,
        },
        needsChange: true,
        changeFor: 50.00, // Invalid! total is 99.80
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    auditReport['Change < Total is blocked'] = 'FAIL';
    console.log('❌ FAIL: Allowed changeFor less than totalAmount.');
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error?.includes('maior ou igual ao total')) {
      auditReport['Change < Total is blocked'] = 'PASS';
      console.log('✅ PASS: Blocked changeFor < totalAmount with clear error (400).');
    } else {
      console.log('❌ FAIL: Unexpected error for change validation:', err.response?.data);
      auditReport['Change < Total is blocked'] = 'FAIL';
    }
  }

  // Now create with valid change: changeFor = 150.00 (troco a devolver: 50.20)
  let createdOrder: any = null;
  try {
    const orderRes = await axios.post(
      `${BASE_URL}/orders`,
      {
        items: [{ productId: prodB.id, quantity: 1 }],
        paymentMethod: 'Dinheiro (Pagamento na Entrega)',
        deliveryMethod: 'DELIVERY',
        deliveryAddress: {
          street: tutorUser.address,
          number: tutorUser.number,
          complement: tutorUser.complement,
          neighborhood: tutorUser.neighborhood,
          city: tutorUser.city,
          state: tutorUser.state,
          zipCode: tutorUser.zipCode,
        },
        needsChange: true,
        changeFor: 150.00,
        notes: 'Casa com portão branco',
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    createdOrder = orderRes.data;

    const returnChange = createdOrder.changeFor - createdOrder.totalAmount;
    if (
      createdOrder.totalAmount === 99.80 &&
      createdOrder.changeFor === 150.00 &&
      Math.abs(returnChange - 50.20) < 0.01 &&
      createdOrder.items.length === 1 &&
      createdOrder.items[0].productId === prodB.id
    ) {
      auditReport['Order with valid change created'] = 'PASS';
      console.log(`✅ PASS: Order created with total R$ 99.80, changeFor R$ 150.00, return: R$ ${returnChange.toFixed(2)}.`);
    } else {
      auditReport['Order with valid change created'] = 'FAIL';
      console.log('❌ FAIL: Order data incorrect:', createdOrder);
    }
  } catch (err: any) {
    console.log('❌ FAIL: Order creation failed:', err.response?.data);
    auditReport['Order with valid change created'] = 'FAIL';
  }

  // Verify Cart still has Product A and was NOT cleared
  const cartItemsAfter = await prisma.cartItem.findMany({
    where: { tutorId: tutorUser.id },
  });
  if (cartItemsAfter.length === 1 && cartItemsAfter[0].productId === prodA.id) {
    auditReport['Cart preserved during Direct Purchase'] = 'PASS';
    console.log('✅ PASS: Cart still contains Product A after Direct Purchase of Product B!');
  } else {
    auditReport['Cart preserved during Direct Purchase'] = 'FAIL';
    console.log('❌ FAIL: Cart was altered during direct purchase:', cartItemsAfter);
  }

  // Verify Product B stock decremented from 10 to 9
  const prodBAfter = await prisma.product.findUnique({ where: { id: prodB.id } });
  if (prodBAfter?.stock === 9) {
    auditReport['Stock decremented on purchase'] = 'PASS';
    console.log('✅ PASS: Product B stock correctly decremented from 10 to 9.');
  } else {
    auditReport['Stock decremented on purchase'] = 'FAIL';
    console.log(`❌ FAIL: Product B stock is ${prodBAfter?.stock}, expected 9.`);
  }

  // ----------------------------------------------------
  // TEST 4: Order Status Governance & Security
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Order Status Governance & Security ---');

  // Login as Establishment to get token
  const estUser = establishment.user;
  const hash = await bcrypt.hash('SenhaForte123!', 10);
  await prisma.user.update({ where: { id: estUser.id }, data: { password: hash } });
  const estLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: estUser.email,
    password: 'SenhaForte123!',
  });
  const estToken = estLoginRes.data.token;

  // 4a. Establishment attempts to unilaterally set status to COMPLETED -> MUST BE BLOCKED
  try {
    await axios.put(
      `${BASE_URL}/establishment/orders/${createdOrder.id}/status`,
      { status: 'COMPLETED' },
      { headers: { Authorization: `Bearer ${estToken}` } }
    );
    auditReport['Establishment setting COMPLETED is blocked'] = 'FAIL';
    console.log('❌ FAIL: Establishment was able to mark order as COMPLETED!');
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error?.includes('cliente/tutor')) {
      auditReport['Establishment setting COMPLETED is blocked'] = 'PASS';
      console.log('✅ PASS: Establishment blocked from setting COMPLETED (HTTP 400).');
    } else {
      console.log('❌ FAIL: Unexpected error for COMPLETED transition:', err.response?.data);
      auditReport['Establishment setting COMPLETED is blocked'] = 'FAIL';
    }
  }

  // 4b. Establishment advances pipeline: PENDING -> CONFIRMED -> PREPARING -> SHIPPED
  try {
    await axios.put(
      `${BASE_URL}/establishment/orders/${createdOrder.id}/status`,
      { status: 'CONFIRMED' },
      { headers: { Authorization: `Bearer ${estToken}` } }
    );
    await axios.put(
      `${BASE_URL}/establishment/orders/${createdOrder.id}/status`,
      { status: 'PREPARING' },
      { headers: { Authorization: `Bearer ${estToken}` } }
    );
    const shipRes = await axios.put(
      `${BASE_URL}/establishment/orders/${createdOrder.id}/status`,
      { status: 'SHIPPED' },
      { headers: { Authorization: `Bearer ${estToken}` } }
    );
    if (shipRes.data.status === 'SHIPPED') {
      auditReport['Establishment advances status to SHIPPED'] = 'PASS';
      console.log('✅ PASS: Order status successfully advanced to SHIPPED.');
    }
  } catch (err: any) {
    console.log('❌ FAIL: Error advancing status:', err.response?.data);
    auditReport['Establishment advances status to SHIPPED'] = 'FAIL';
  }

  // 4c. Tutor confirms receipt -> Order transitions to COMPLETED
  try {
    const confirmRes = await axios.post(
      `${BASE_URL}/orders/${createdOrder.id}/confirm-receipt`,
      {},
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    if (confirmRes.data.order?.status === 'COMPLETED') {
      auditReport['Tutor confirms receipt -> COMPLETED'] = 'PASS';
      console.log('✅ PASS: Tutor successfully confirmed receipt, order is COMPLETED.');
    } else {
      auditReport['Tutor confirms receipt -> COMPLETED'] = 'FAIL';
      console.log('❌ FAIL: Order did not transition to COMPLETED:', confirmRes.data);
    }
  } catch (err: any) {
    console.log('❌ FAIL: Tutor confirm receipt error:', err.response?.data);
    auditReport['Tutor confirms receipt -> COMPLETED'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST 5: Cancellation Flow & Stock Restoration
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Cancellation Flow & Stock Restoration ---');

  // 5a. Create order 2 to test Establishment cancellation
  const orderForEstCancelRes = await axios.post(
    `${BASE_URL}/orders`,
    {
      items: [{ productId: prodB.id, quantity: 2 }],
      paymentMethod: 'Pix',
      deliveryMethod: 'DELIVERY',
      deliveryAddress: {
        street: tutorUser.address,
        number: tutorUser.number,
        neighborhood: tutorUser.neighborhood,
        city: tutorUser.city,
        state: tutorUser.state,
        zipCode: tutorUser.zipCode,
      },
    },
    { headers: { Authorization: `Bearer ${tutorToken}` } }
  );
  const orderForEstCancel = orderForEstCancelRes.data;
  console.log(`Created order for establishment cancellation: #${orderForEstCancel.id.slice(0, 8)}`);

  const prodBStockAfterOrder2 = await prisma.product.findUnique({ where: { id: prodB.id } });
  console.log(`Product B stock before est cancel: ${prodBStockAfterOrder2?.stock} (decremented by 2)`);

  // Establishment cancels order
  const estCancelRes = await axios.post(
    `${BASE_URL}/establishment/orders/${orderForEstCancel.id}/cancel`,
    {
      reason: 'Produto avariado / indisponível',
      notes: 'Lote com defeito de fábrica',
    },
    { headers: { Authorization: `Bearer ${estToken}` } }
  );

  const prodBStockAfterEstCancel = await prisma.product.findUnique({ where: { id: prodB.id } });
  const cancelledOrderInDb = await prisma.order.findUnique({ where: { id: orderForEstCancel.id } });

  if (
    prodBStockAfterEstCancel?.stock === (prodBStockAfterOrder2?.stock || 0) + 2 &&
    cancelledOrderInDb?.status === 'CANCELLED' &&
    cancelledOrderInDb?.cancelledBy === 'ESTABLISHMENT' &&
    cancelledOrderInDb?.cancellationReason === 'Produto avariado / indisponível'
  ) {
    auditReport['Establishment cancel restores stock & logs reason'] = 'PASS';
    console.log(`✅ PASS: Establishment cancellation restored stock to ${prodBStockAfterEstCancel?.stock} and logged reason.`);
  } else {
    auditReport['Establishment cancel restores stock & logs reason'] = 'FAIL';
    console.log('❌ FAIL: Stock restoration or cancellation log failed.');
  }

  // 5b. Create order 3 to test Tutor cancellation
  const orderForTutorCancelRes = await axios.post(
    `${BASE_URL}/orders`,
    {
      items: [{ productId: prodB.id, quantity: 1 }],
      paymentMethod: 'Cartão de Crédito',
      deliveryMethod: 'PICKUP',
    },
    { headers: { Authorization: `Bearer ${tutorToken}` } }
  );
  const orderForTutorCancel = orderForTutorCancelRes.data;

  const prodBStockBeforeTutorCancel = await prisma.product.findUnique({ where: { id: prodB.id } });

  // Tutor cancels order
  const tutorCancelRes = await axios.post(
    `${BASE_URL}/orders/${orderForTutorCancel.id}/cancel`,
    {
      reason: 'Comprei por engano',
      notes: 'Selecionei o produto errado',
    },
    { headers: { Authorization: `Bearer ${tutorToken}` } }
  );

  const prodBStockAfterTutorCancel = await prisma.product.findUnique({ where: { id: prodB.id } });
  const cancelledTutorOrderInDb = await prisma.order.findUnique({ where: { id: orderForTutorCancel.id } });

  if (
    prodBStockAfterTutorCancel?.stock === (prodBStockBeforeTutorCancel?.stock || 0) + 1 &&
    cancelledTutorOrderInDb?.status === 'CANCELLED' &&
    cancelledTutorOrderInDb?.cancelledBy === 'TUTOR' &&
    cancelledTutorOrderInDb?.cancellationReason === 'Comprei por engano'
  ) {
    auditReport['Tutor cancel restores stock & logs reason'] = 'PASS';
    console.log(`✅ PASS: Tutor cancellation restored stock to ${prodBStockAfterTutorCancel?.stock} and logged reason.`);
  } else {
    auditReport['Tutor cancel restores stock & logs reason'] = 'FAIL';
    console.log('❌ FAIL: Tutor cancellation or stock restoration failed.');
  }

  // ----------------------------------------------------
  // TEST 6: Notifications Emitted
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Notifications Emitted ---');
  const tutorNotifications = await prisma.notification.findMany({
    where: { userId: tutorUser.id },
  });
  console.log(`Tutor has ${tutorNotifications.length} notification(s).`);
  const estNotifications = await prisma.notification.findMany({
    where: { userId: establishment.userId },
  });
  console.log(`Establishment has ${estNotifications.length} notification(s).`);

  if (tutorNotifications.length > 0 && estNotifications.length > 0) {
    auditReport['Notifications created on lifecycle events'] = 'PASS';
    console.log('✅ PASS: Real notifications registered in database for both tutor and establishment.');
  } else {
    auditReport['Notifications created on lifecycle events'] = 'FAIL';
    console.log('❌ FAIL: Missing notifications.');
  }

  // ----------------------------------------------------
  // CLEANUP TEST DATA
  // ----------------------------------------------------
  console.log('\n--- Cleaning up temporary test records ---');
  await prisma.cartItem.deleteMany({ where: { tutorId: tutorUser.id } });
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: [createdOrder.id, orderForEstCancel.id, orderForTutorCancel.id] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [createdOrder.id, orderForEstCancel.id, orderForTutorCancel.id] } },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: [tutorUser.id] } },
  });
  await prisma.product.deleteMany({ where: { id: { in: [prodA.id, prodB.id] } } });
  await prisma.user.delete({ where: { id: tutorUser.id } });
  console.log('✅ Cleaned up temporary test records.');

  console.log('\n====================================================');
  console.log('📊 AUDIT SUMMARY TABLE:');
  console.log('====================================================');
  console.table(auditReport);
}

runForensicAudit()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
