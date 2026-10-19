import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function seedDemoData() {
  console.log('===============================================================');
  console.log('🌱 INICIANDO INSERÇÃO DE DADOS DEMONSTRATIVOS (PET-HUB)');
  console.log('===============================================================\n');

  // 1. Locate establishment pethub@gmail.com
  const estabUser = await prisma.user.findUnique({
    where: { email: 'pethub@gmail.com' },
    include: { establishmentProfile: true },
  });

  if (!estabUser) {
    throw new Error('Estabelecimento pethub@gmail.com não encontrado.');
  }

  const estabId = estabUser.id;
  console.log(`Estabelecimento identificado: ${estabUser.name} (${estabId})`);

  // Idempotency: Clean up any previous demo runs cleanly
  console.log('Limpando registros demonstrativos anteriores (se existirem)...');
  await prisma.orderItem.deleteMany({
    where: { order: { notes: 'DEMO — APRESENTAÇÃO PETHUB' } },
  });
  await prisma.order.deleteMany({
    where: { notes: 'DEMO — APRESENTAÇÃO PETHUB' },
  });
  await prisma.appointment.deleteMany({
    where: { petTransport: 'DEMO — APRESENTAÇÃO PETHUB' },
  });
  console.log('Ambiente limpo para inserção idempotente.');

  // 2. Fetch existing services, products, employees
  const services = await prisma.service.findMany({
    where: { establishmentId: estabId },
  });
  console.log(`Serviços disponíveis (${services.length}):`, services.map((s) => `${s.name} - R$ ${s.price}`));

  const products = await prisma.product.findMany({
    where: { establishmentId: estabId },
  });
  console.log(`Produtos disponíveis (${products.length}):`, products.map((p) => `${p.name} - R$ ${p.price} (Estoque: ${p.stock})`));

  const employees = await prisma.employee.findMany({
    where: { establishmentId: estabId, active: true },
  });
  console.log(`Funcionários disponíveis (${employees.length}):`, employees.map((e) => `${e.name} (${e.role})`));

  // 3. Fetch existing tutors and pets (strictly reusing existing)
  const tutors = await prisma.user.findMany({
    where: {
      role: 'TUTOR',
      pets: { some: {} },
    },
    include: {
      pets: true,
      addresses: true,
    },
  });

  if (tutors.length === 0) {
    throw new Error('Nenhum tutor com pet encontrado para associação de dados demonstrativos.');
  }

  console.log(`Tutores disponíveis com pets (${tutors.length}):`, tutors.map((t) => `${t.name} (${t.email}, ${t.pets.length} pets)`));

  // Collect all available pets
  const allPets = tutors.flatMap((t) => t.pets.map((p) => ({ pet: p, tutor: t })));
  console.log(`Total de pets disponíveis para atendimento: ${allPets.length}`);

  const dogPets = allPets.filter((item) => (item.pet.species || '').toUpperCase().includes('DOG') || (item.pet.species || '').toUpperCase().includes('CÃO') || (item.pet.species || '').toUpperCase().includes('CANIN') || item.pet.species === 'DOG');
  const catPets = allPets.filter((item) => (item.pet.species || '').toUpperCase().includes('CAT') || (item.pet.species || '').toUpperCase().includes('GATO') || (item.pet.species || '').toUpperCase().includes('FELIN') || item.pet.species === 'CAT');
  
  const availableDogs = dogPets.length > 0 ? dogPets : allPets;
  const availableCats = catPets.length > 0 ? catPets : allPets;

  // Track all generated IDs for audit and reproducibility
  const manifest = {
    establishment: {
      id: estabId,
      name: estabUser.name,
      email: estabUser.email,
    },
    generatedAt: new Date().toISOString(),
    demoTag: 'DEMO — APRESENTAÇÃO PETHUB',
    appointments: [] as any[],
    orders: [] as any[],
    financials: {
      servicesRevenue: 0,
      productsRevenue: 0,
      totalAccumulatedRevenue: 0,
    },
  };

  // =========================================================================
  // GENERATE COMPLETED & PAID APPOINTMENTS
  // Target: ~R$ 3.000,00
  // Distributed over the last 14 days
  // =========================================================================
  console.log('\n--- Inserindo Agendamentos de Serviços Demonstrativos ---');

  const paymentMethods = ['Cartão de Débito', 'PIX', 'Dinheiro', 'Cartão de Crédito'];
  const appointmentPlans = [
    { serviceName: 'Tosa', count: 14, pool: availableDogs },
    { serviceName: 'Banho Canino', count: 16, pool: availableDogs },
    { serviceName: 'Banho Felino', count: 14, pool: availableCats },
  ];

  let totalServicesRevenue = 0;
  let dayOffset = 1;

  for (const plan of appointmentPlans) {
    const svc = services.find((s) => s.name.toLowerCase().includes(plan.serviceName.toLowerCase())) || services[0];
    const price = svc.price;

    for (let i = 0; i < plan.count; i++) {
      const pair = plan.pool[i % plan.pool.length];
      const emp = employees[i % employees.length];
      const method = paymentMethods[i % paymentMethods.length];

      // Spread dates backwards from 1 to 14 days ago
      const aptDate = new Date();
      aptDate.setDate(aptDate.getDate() - ((dayOffset % 14) + 1));
      aptDate.setHours(9 + (i % 8), (i % 4) * 15, 0, 0);
      dayOffset++;

      const createdApt = await prisma.appointment.create({
        data: {
          establishmentId: estabId,
          tutorId: pair.tutor.id,
          petId: pair.pet.id,
          serviceId: svc.id,
          employeeId: emp.id,
          date: aptDate,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentMethod: method,
          totalAmount: price,
          finalAmount: price,
          petTransport: 'DEMO — APRESENTAÇÃO PETHUB',
          confirmedByTutor: true,
          confirmedByTutorAt: aptDate,
        },
      });

      totalServicesRevenue += price;
      manifest.appointments.push({
        id: createdApt.id,
        service: svc.name,
        price,
        date: aptDate.toISOString(),
        tutor: pair.tutor.name,
        pet: pair.pet.name,
        employee: emp.name,
        paymentMethod: method,
      });
    }
  }

  console.log(`✅ ${manifest.appointments.length} agendamentos de serviços criados. Subtotal: R$ ${totalServicesRevenue.toFixed(2)}`);

  // =========================================================================
  // GENERATE DELIVERED PRODUCT ORDERS
  // Target: ~R$ 2.500,00
  // Distributed over the last 14 days
  // =========================================================================
  console.log('\n--- Inserindo Pedidos de Produtos Demonstrativos ---');

  const catFood = products.find((p) => p.name.includes('Cat')) || products[0];
  const dogFood = products.find((p) => p.name.includes('Canina')) || products[1] || products[0];

  // Define 8 realistic customer shopping carts
  const orderConfigs = [
    { tutor: tutors[0 % tutors.length], items: [{ prod: dogFood, qty: 1 }, { prod: catFood, qty: 2 }], dayAgo: 1 },
    { tutor: tutors[1 % tutors.length] || tutors[0], items: [{ prod: dogFood, qty: 2 }], dayAgo: 2 },
    { tutor: tutors[0 % tutors.length], items: [{ prod: catFood, qty: 3 }], dayAgo: 4 },
    { tutor: tutors[1 % tutors.length] || tutors[0], items: [{ prod: dogFood, qty: 1 }, { prod: catFood, qty: 1 }], dayAgo: 5 },
    { tutor: tutors[0 % tutors.length], items: [{ prod: dogFood, qty: 2 }], dayAgo: 7 },
    { tutor: tutors[1 % tutors.length] || tutors[0], items: [{ prod: catFood, qty: 4 }], dayAgo: 9 },
    { tutor: tutors[0 % tutors.length], items: [{ prod: dogFood, qty: 1 }, { prod: catFood, qty: 2 }], dayAgo: 11 },
    { tutor: tutors[1 % tutors.length] || tutors[0], items: [{ prod: dogFood, qty: 2 }, { prod: catFood, qty: 3 }], dayAgo: 13 },
  ];

  let totalProductsRevenue = 0;

  for (let idx = 0; idx < orderConfigs.length; idx++) {
    const cfg = orderConfigs[idx];
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - cfg.dayAgo);
    orderDate.setHours(10 + idx, 30, 0, 0);

    let orderTotal = 0;
    for (const it of cfg.items) {
      orderTotal += it.prod.price * it.qty;
    }

    const tutorAddr = cfg.tutor.addresses?.[0];
    const deliveryAddress = tutorAddr
      ? { street: tutorAddr.street, number: tutorAddr.number, city: tutorAddr.city, state: tutorAddr.state }
      : { street: 'Rua das Flores', number: '100', city: 'Ourinhos', state: 'SP' };

    const order = await prisma.order.create({
      data: {
        tutorId: cfg.tutor.id,
        status: 'DELIVERED',
        totalAmount: orderTotal,
        subtotalAmount: orderTotal,
        paymentMethod: idx % 2 === 0 ? 'PIX' : 'Cartão de Crédito',
        deliveryMethod: 'DELIVERY',
        deliveryAddress: deliveryAddress as any,
        notes: 'DEMO — APRESENTAÇÃO PETHUB',
        createdAt: orderDate,
        updatedAt: orderDate,
        items: {
          create: cfg.items.map((it) => ({
            productId: it.prod.id,
            establishmentId: estabId,
            quantity: it.qty,
            priceAtTime: it.prod.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Update product stock decrement
    for (const it of cfg.items) {
      await prisma.product.update({
        where: { id: it.prod.id },
        data: { stock: { decrement: it.qty } },
      });
    }

    totalProductsRevenue += orderTotal;
    manifest.orders.push({
      id: order.id,
      totalAmount: orderTotal,
      createdAt: orderDate.toISOString(),
      tutor: cfg.tutor.name,
      items: cfg.items.map((it) => ({ name: it.prod.name, qty: it.qty, price: it.prod.price })),
    });
  }

  console.log(`✅ ${manifest.orders.length} pedidos de produtos criados. Subtotal: R$ ${totalProductsRevenue.toFixed(2)}`);

  const grandTotal = totalServicesRevenue + totalProductsRevenue;
  manifest.financials = {
    servicesRevenue: totalServicesRevenue,
    productsRevenue: totalProductsRevenue,
    totalAccumulatedRevenue: grandTotal,
  };

  console.log(`\n===============================================================`);
  console.log(`💰 TOTAL DEMONSTRATIVO ACUMULADO: R$ ${grandTotal.toFixed(2)}`);
  console.log(`   - Serviços Concluídos e Pagos: R$ ${totalServicesRevenue.toFixed(2)}`);
  console.log(`   - Produtos Vendidos (Pedidos): R$ ${totalProductsRevenue.toFixed(2)}`);
  console.log(`===============================================================`);

  // Write manifest file to persist all IDs for traceability and future cleanup
  const manifestPath = path.resolve(__dirname, '../../demo_presentation_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`📄 Manifesto de auditoria salvo em: ${manifestPath}`);
}

seedDemoData()
  .catch((err) => {
    console.error('Erro ao gerar dados demonstrativos:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
