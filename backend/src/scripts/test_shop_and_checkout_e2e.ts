import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const BASE_URL = 'http://localhost:3000';
const DEFAULT_PASSWORD = 'Password123!';

async function req(url: string, options: any = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  return { status: res.status, ok: res.ok, data };
}

async function loginUser(email: string, password = DEFAULT_PASSWORD): Promise<string> {
  const res = await req('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!res.ok || !res.data?.token) {
    throw new Error(`Falha ao autenticar ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data.token;
}

async function runTests() {
  console.log('============================================================');
  console.log('🧪 PET HUB - TEST SUITE: SHOP & CHECKOUT FLOW E2E');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // 1. Setup / identify Test Users & Active Establishment
  console.log('🔹 1. Buscando e preparando usuários reais no banco...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  
  // Find or create Tutor
  let tutor = await prisma.user.findFirst({ where: { role: 'TUTOR' } });
  if (!tutor) {
    tutor = await prisma.user.create({
      data: {
        name: 'Tutor Teste Checkout',
        email: `tutor_checkout_${Date.now()}@pethub.com`,
        password: passwordHash,
        hasPassword: true,
        role: 'TUTOR',
        phone: '(14) 99888-7777',
      }
    });
  } else {
    // Update password to ensure login succeeds
    await prisma.user.update({
      where: { id: tutor.id },
      data: { password: passwordHash, hasPassword: true }
    });
  }
  const tutorToken = await loginUser(tutor.email);

  // Find or create Establishment A (with active profile and product)
  let estabA = await prisma.user.findFirst({
    where: {
      role: 'ESTABLISHMENT',
      establishmentProfile: { status: 'ACTIVE' }
    },
    include: { establishmentProfile: true }
  });

  if (!estabA) {
    estabA = await prisma.user.create({
      data: {
        name: 'Pet Shop Alpha',
        email: `estab_alpha_${Date.now()}@pethub.com`,
        password: passwordHash,
        hasPassword: true,
        role: 'ESTABLISHMENT',
        phone: '(14) 3322-1100',
        establishmentProfile: {
          create: {
            businessName: 'Pet Shop Alpha Ltda',
            status: 'ACTIVE',
            address: 'Rua Paraná, 450',
            city: 'Ourinhos',
            state: 'SP',
            zipCode: '19900-000',
            photos: ['/uploads/images/alpha-store.jpg'],
          }
        }
      },
      include: { establishmentProfile: true }
    });
  } else {
    await prisma.user.update({
      where: { id: estabA.id },
      data: { password: passwordHash, hasPassword: true }
    });
  }
  const estabAToken = await loginUser(estabA.email);

  // Find or create Establishment B (for multi-tenant isolation testing)
  let estabB = await prisma.user.findFirst({
    where: {
      role: 'ESTABLISHMENT',
      id: { not: estabA.id }
    },
    include: { establishmentProfile: true }
  });

  if (!estabB) {
    estabB = await prisma.user.create({
      data: {
        name: 'Pet Shop Beta',
        email: `estab_beta_${Date.now()}@pethub.com`,
        password: passwordHash,
        hasPassword: true,
        role: 'ESTABLISHMENT',
        phone: '(14) 3322-9988',
        establishmentProfile: {
          create: {
            businessName: 'Pet Shop Beta Ltda',
            status: 'ACTIVE',
            address: 'Av. Altino Arantes, 120',
            city: 'Ourinhos',
            state: 'SP',
            zipCode: '19900-010',
            photos: ['/uploads/images/beta-store.jpg'],
          }
        }
      },
      include: { establishmentProfile: true }
    });
  } else {
    await prisma.user.update({
      where: { id: estabB.id },
      data: { password: passwordHash, hasPassword: true }
    });
  }
  const estabBToken = await loginUser(estabB.email);

  // Ensure Establishment A has an active product with stock
  let productA = await prisma.product.findFirst({
    where: { establishmentId: estabA.id, stock: { gt: 10 } }
  });

  if (!productA) {
    productA = await prisma.product.create({
      data: {
        name: 'Ração Super Premium 1kg',
        description: 'Alimento completo e balanceado para cães adultos',
        price: 89.90,
        stock: 50,
        photo: '/uploads/images/racao-premium.png',
        establishmentId: estabA.id,
      }
    });
  }

  console.log(`  Tutor: ${tutor.name} (${tutor.email})`);
  console.log(`  Estabelecimento A: ${estabA.establishmentProfile?.businessName || estabA.name} (ID: ${estabA.id})`);
  console.log(`  Estabelecimento B: ${estabB.establishmentProfile?.businessName || estabB.name} (ID: ${estabB.id})`);
  console.log(`  Produto: ${productA.name} - R$ ${productA.price} (Estoque: ${productA.stock})`);

  // =========================================================================
  // TEST 1: GET /api/products returns establishment photo and details
  // =========================================================================
  console.log('\n🔹 TEST 1: Verificação da listagem de produtos com identificação visual do estabelecimento');
  const productsRes = await req('/api/products');
  assert(productsRes.status === 200, 'GET /api/products retorna status 200');
  assert(Array.isArray(productsRes.data) && productsRes.data.length > 0, 'Retorna lista de produtos');

  const returnedProd = productsRes.data.find((p: any) => p.id === productA!.id);
  assert(!!returnedProd, 'Produto A está presente na listagem pública');
  assert(!!returnedProd.establishment, 'Produto inclui dados do estabelecimento');
  assert(
    returnedProd.establishment.establishmentProfile?.photos !== undefined ||
    returnedProd.establishment.avatar !== undefined ||
    returnedProd.establishment.defaultAvatar !== undefined,
    'Produto inclui foto/avatar do estabelecimento'
  );
  assert(!!returnedProd.establishment.establishmentProfile?.businessName, 'Produto inclui nome fantasia do estabelecimento');

  // =========================================================================
  // TEST SCENARIO 1: COMPRA COM ENTREGA + DINHEIRO COM TROCO
  // =========================================================================
  console.log('\n🔹 TEST SCENARIO 1: Compra com Entrega + Dinheiro com Troco para R$ 100,00');
  const initialStock = productA.stock;
  const order1Payload = {
    items: [{ productId: productA.id, quantity: 1 }],
    deliveryMethod: 'DELIVERY',
    deliveryAddress: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 45',
      neighborhood: 'Jardim Paulista',
      city: 'Ourinhos',
      state: 'SP',
      zipCode: '19900-000',
    },
    paymentMethod: 'Dinheiro',
    needsChange: true,
    changeFor: 100.0,
    notes: 'Interfone quebrado, favor buzinar no portão.',
  };

  const createOrder1Res = await req('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tutorToken}` },
    body: order1Payload,
  });

  assert(createOrder1Res.status === 201, 'POST /api/orders retorna 201 Created');
  const order1 = createOrder1Res.data;
  assert(order1.status === 'PENDING', 'Status inicial é PENDING (sem fingir gateway online)');
  assert(order1.deliveryMethod === 'DELIVERY', 'deliveryMethod é DELIVERY');
  assert(order1.deliveryAddress?.street === 'Rua das Flores', 'Endereço de entrega salvo corretamente');
  assert(order1.deliveryAddress?.number === '123', 'Número salvo corretamente');
  assert(order1.paymentMethod === 'Dinheiro', 'paymentMethod é Dinheiro');
  assert(order1.needsChange === true, 'needsChange é true');
  assert(order1.changeFor === 100.0, 'changeFor é R$ 100,00');
  assert(order1.notes === 'Interfone quebrado, favor buzinar no portão.', 'notes salvo corretamente');

  // Verify stock was atomically decremented
  const updatedProductA = await prisma.product.findUnique({ where: { id: productA.id } });
  assert(updatedProductA?.stock === initialStock - 1, `Estoque decrementado de ${initialStock} para ${initialStock - 1}`);

  // Check that Establishment A receives this order with full details
  const estabOrdersRes = await req('/api/establishment/orders', {
    headers: { Authorization: `Bearer ${estabAToken}` }
  });
  assert(estabOrdersRes.status === 200, 'GET /api/establishment/orders retorna status 200');
  const foundOrder1InEstab = estabOrdersRes.data.find((o: any) => o.id === order1.id);
  assert(!!foundOrder1InEstab, 'Estabelecimento A localizou o pedido criado em sua listagem');
  assert(foundOrder1InEstab.tutor.name === tutor.name, 'Estabelecimento visualiza nome real do comprador');
  assert(foundOrder1InEstab.deliveryMethod === 'DELIVERY', 'Estabelecimento visualiza modalidade Entrega');
  assert(foundOrder1InEstab.deliveryAddress?.street === 'Rua das Flores', 'Estabelecimento visualiza rua do endereço');
  assert(foundOrder1InEstab.paymentMethod === 'Dinheiro', 'Estabelecimento visualiza forma de pagamento Dinheiro');
  assert(foundOrder1InEstab.needsChange === true, 'Estabelecimento visualiza que precisa de troco');
  assert(foundOrder1InEstab.changeFor === 100.0, 'Estabelecimento visualiza troco para R$ 100,00');
  assert(foundOrder1InEstab.notes === 'Interfone quebrado, favor buzinar no portão.', 'Estabelecimento visualiza observações');

  // =========================================================================
  // TEST SCENARIO 2: COMPRA COM RETIRADA NA LOJA + CARTÃO DE CRÉDITO
  // =========================================================================
  console.log('\n🔹 TEST SCENARIO 2: Compra com Retirada na Loja + Cartão de Crédito Presencial');
  const order2Payload = {
    items: [{ productId: productA.id, quantity: 2 }],
    deliveryMethod: 'PICKUP',
    paymentMethod: 'Cartão de Crédito',
    needsChange: false,
    notes: 'Vou retirar às 17h.',
  };

  const createOrder2Res = await req('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tutorToken}` },
    body: order2Payload,
  });
  assert(createOrder2Res.status === 201, 'POST /api/orders retorna 201 para Retirada');
  const order2 = createOrder2Res.data;
  assert(order2.deliveryMethod === 'PICKUP', 'deliveryMethod é PICKUP');
  assert(order2.deliveryAddress === null, 'deliveryAddress é null pois é retirada');
  assert(order2.paymentMethod === 'Cartão de Crédito', 'paymentMethod é Cartão de Crédito');
  assert(order2.status === 'PENDING', 'Status inicial é PENDING');

  // Verify in establishment list
  const estabOrdersRes2 = await req('/api/establishment/orders', {
    headers: { Authorization: `Bearer ${estabAToken}` }
  });
  const foundOrder2InEstab = estabOrdersRes2.data.find((o: any) => o.id === order2.id);
  assert(!!foundOrder2InEstab, 'Estabelecimento visualiza o pedido de Retirada na loja');
  assert(foundOrder2InEstab.deliveryMethod === 'PICKUP', 'Estabelecimento identifica que é Retirada na Loja');
  assert(foundOrder2InEstab.paymentMethod === 'Cartão de Crédito', 'Forma de pagamento é Cartão de Crédito');

  // =========================================================================
  // TEST SCENARIO 3: PAGAMENTO PIX
  // =========================================================================
  console.log('\n🔹 TEST SCENARIO 3: Compra com Pagamento Pix');
  const order3Payload = {
    items: [{ productId: productA.id, quantity: 1 }],
    deliveryMethod: 'DELIVERY',
    deliveryAddress: {
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    },
    paymentMethod: 'Pix',
  };

  const createOrder3Res = await req('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tutorToken}` },
    body: order3Payload,
  });
  assert(createOrder3Res.status === 201, 'POST /api/orders com Pix retorna 201');
  const order3 = createOrder3Res.data;
  assert(order3.paymentMethod === 'Pix', 'paymentMethod registrado como Pix');
  assert(order3.status === 'PENDING', 'Status registrado como PENDING (sem fake gateway)');

  // =========================================================================
  // TEST SCENARIO 4: PREVENÇÃO DE ESTOQUE INSUFICIENTE / VALIDAÇÕES
  // =========================================================================
  console.log('\n🔹 TEST SCENARIO 4: Validação de Estoque e Troco Inválido');
  
  // Troco menor que o valor total
  const invalidChangeRes = await req('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tutorToken}` },
    body: {
      items: [{ productId: productA.id, quantity: 1 }],
      deliveryMethod: 'DELIVERY',
      deliveryAddress: {
        street: 'Rua A',
        number: '1',
        neighborhood: 'Centro',
        city: 'Ourinhos',
        state: 'SP',
        zipCode: '19900-000',
      },
      paymentMethod: 'Dinheiro',
      needsChange: true,
      changeFor: 10.0, // menor que o preço de R$ 89,90
    },
  });
  assert(invalidChangeRes.status === 400, 'Rejeita com 400 quando troco é menor que o valor do pedido');

  // Estoque insuficiente
  const invalidStockRes = await req('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tutorToken}` },
    body: {
      items: [{ productId: productA.id, quantity: 999999 }],
      deliveryMethod: 'PICKUP',
      paymentMethod: 'Cartão de Débito',
    },
  });
  assert(invalidStockRes.status === 400, 'Rejeita com 400 quando quantidade excede estoque');

  // =========================================================================
  // TEST SCENARIO 5: ISOLAMENTO MULTI-TENANT E SEGURANÇA
  // =========================================================================
  console.log('\n🔹 TEST SCENARIO 5: Isolamento de Segurança Multi-tenant');
  
  // Estabelecimento B NÃO pode ver pedidos do Estabelecimento A
  const estabBOrdersRes = await req('/api/establishment/orders', {
    headers: { Authorization: `Bearer ${estabBToken}` }
  });
  const order1InEstabB = estabBOrdersRes.data.find((o: any) => o.id === order1.id);
  assert(!order1InEstabB, 'Estabelecimento B NÃO consegue visualizar pedido do Estabelecimento A');

  // Estabelecimento B NÃO pode alterar status de pedido do Estabelecimento A
  const hackStatusRes = await req(`/api/establishment/orders/${order1.id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${estabBToken}` },
    body: { status: 'DELIVERED' },
  });
  assert(hackStatusRes.status === 403, 'Rejeita com 403 Acesso negado quando Estabelecimento B tenta alterar pedido de A');

  // Outro Tutor NÃO pode consultar pedido privado do Tutor A
  const otherTutor = await prisma.user.create({
    data: {
      name: 'Outro Tutor Invasor',
      email: `tutor_invasor_${Date.now()}@pethub.com`,
      password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
      hasPassword: true,
      role: 'TUTOR',
    }
  });
  const otherTutorToken = await loginUser(otherTutor.email);

  const hackTutorRes = await req(`/api/orders/${order1.id}`, {
    headers: { Authorization: `Bearer ${otherTutorToken}` }
  });
  assert(hackTutorRes.status === 403, 'Rejeita com 403 quando Tutor B tenta acessar pedido do Tutor A');

  // Clean up other tutor
  await prisma.user.delete({ where: { id: otherTutor.id } });

  // =========================================================================
  // TEST SCENARIO 6: TRANSIÇÃO DE STATUS E NOTIFICAÇÃO REAL
  // =========================================================================
  console.log('\n🔹 TEST SCENARIO 6: Transição de Status e Notificação Real ao Tutor');
  const updateStatusRes = await req(`/api/establishment/orders/${order1.id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${estabAToken}` },
    body: { status: 'SHIPPED' },
  });
  assert(updateStatusRes.status === 200, 'Estabelecimento A atualiza status para SHIPPED com sucesso');

  // Verify notification was created in database for the tutor
  const tutorNotification = await prisma.notification.findFirst({
    where: {
      userId: tutor.id,
      type: 'ORDER',
    },
    orderBy: { createdAt: 'desc' }
  });
  assert(!!tutorNotification, 'Notificação real de pedido gerada no banco para o tutor');
  console.log(`  Mensagem da notificação: "${tutorNotification?.title}" - "${tutorNotification?.message}"`);

  console.log('\n============================================================');
  console.log(`🎉 RESULTADO FINAL: ${passed}/${total} TESTES PASSARAM COM SUCESSO!`);
  console.log('============================================================\n');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
