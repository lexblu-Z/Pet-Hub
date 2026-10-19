import { prisma } from '../lib/prisma';

async function inspectTosa() {
  const estab = await prisma.user.findUnique({ where: { email: 'pethub@gmail.com' } });
  if (!estab) {
    console.log('Estabelecimento não encontrado.');
    return;
  }

  const tosa = await prisma.service.findFirst({
    where: { establishmentId: estab.id, name: { contains: 'Tosa', mode: 'insensitive' } },
  });
  console.log(`Serviço Tosa: ID ${tosa?.id}, Preço R$ ${tosa?.price}`);

  const appointments = await prisma.appointment.findMany({
    where: { establishmentId: estab.id, serviceId: tosa?.id },
    select: {
      id: true,
      date: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      totalAmount: true,
      finalAmount: true,
      petTransport: true,
      createdAt: true,
    },
    orderBy: { date: 'asc' },
  });

  console.log(`\nTotal de agendamentos de Tosa: ${appointments.length}`);
  console.log('---------------------------------------------------------');
  
  let paidCompletedCount = 0;
  let nonPaidOrNonCompletedCount = 0;

  for (const a of appointments) {
    const isPaidCompleted = a.status === 'COMPLETED' && a.paymentStatus === 'PAID';
    if (isPaidCompleted) {
      paidCompletedCount++;
    } else {
      nonPaidOrNonCompletedCount++;
    }

    const flag = isPaidCompleted ? '🟢 [PAGO & CONCLUÍDO]' : '🔴 [NÃO ELEGÍVEL / PENDENTE]';
    console.log(`${flag} ID: ${a.id} | Data: ${a.date.toISOString().slice(0, 16)} | Status: ${a.status} | PaymentStatus: ${a.paymentStatus} | Valor: R$ ${a.finalAmount ?? a.totalAmount} | Demo: ${a.petTransport === 'DEMO — APRESENTAÇÃO PETHUB'}`);
  }

  console.log('\n---------------------------------------------------------');
  console.log(`Resumo Tosa:`);
  console.log(`- Concluídos e Pagos (Elegíveis para faturamento realizado): ${paidCompletedCount} (R$ ${(paidCompletedCount * 79.9).toFixed(2)})`);
  console.log(`- Não elegíveis / Pendentes: ${nonPaidOrNonCompletedCount} (R$ ${(nonPaidOrNonCompletedCount * 79.9).toFixed(2)})`);

  // Also inspect Banho Canino and Banho Felino
  const otherServices = await prisma.service.findMany({
    where: { establishmentId: estab.id, id: { not: tosa?.id } },
  });

  for (const svc of otherServices) {
    const appts = await prisma.appointment.findMany({
      where: { establishmentId: estab.id, serviceId: svc.id },
      select: { id: true, status: true, paymentStatus: true, finalAmount: true },
    });
    const paidCompleted = appts.filter((a) => a.status === 'COMPLETED' && a.paymentStatus === 'PAID');
    const others = appts.filter((a) => !(a.status === 'COMPLETED' && a.paymentStatus === 'PAID'));
    console.log(`\nServiço ${svc.name} (R$ ${svc.price}): Total ${appts.length}`);
    console.log(`- Concluídos e Pagos: ${paidCompleted.length} (R$ ${(paidCompleted.length * svc.price).toFixed(2)})`);
    console.log(`- Outros / Pendentes: ${others.length} (R$ ${(others.length * svc.price).toFixed(2)})`);
  }

  // Also inspect products
  const products = await prisma.product.findMany({
    where: { establishmentId: estab.id },
  });

  console.log('\n---------------------------------------------------------');
  console.log('Produtos e Vendas:');
  const APPROVED_ORDER_STATUSES = [
    'PAID',
    'CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'READY_FOR_PICKUP',
    'DELIVERED',
    'COMPLETED',
  ];

  for (const prod of products) {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        productId: prod.id,
        establishmentId: estab.id,
        order: { status: { in: APPROVED_ORDER_STATUSES as any } },
      },
      select: { quantity: true, priceAtTime: true },
    });
    const totalQty = orderItems.reduce((acc, it) => acc + it.quantity, 0);
    const totalRev = orderItems.reduce((acc, it) => acc + it.priceAtTime * it.quantity, 0);
    console.log(`- ${prod.name}: ${totalQty} vendidos | Receita: R$ ${totalRev.toFixed(2)}`);
  }
}

inspectTosa().finally(() => prisma.$disconnect());
