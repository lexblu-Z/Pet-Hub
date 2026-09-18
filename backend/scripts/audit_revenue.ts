import { prisma } from '../src/lib/prisma';
import { OrderStatus } from '@prisma/client';

async function main() {
  console.log('=== AUDIT REVENUE & ORDERS ===');
  const establishments = await prisma.user.findMany({
    where: { role: 'ESTABLISHMENT' },
    include: { establishmentProfile: true },
  });
  console.log(`Found ${establishments.length} establishment(s):`);
  for (const est of establishments) {
    console.log(`- ID: ${est.id}, Name: ${est.name}, Email: ${est.email}`);
  }

  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: true,
        },
      },
      tutor: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${orders.length} order(s):`);
  for (const order of orders) {
    console.log(`\nOrder ID: ${order.id}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Total: R$ ${order.totalAmount}`);
    console.log(`  DeliveryMethod: ${order.deliveryMethod}`);
    console.log(`  CreatedAt: ${order.createdAt.toISOString()}`);
    console.log(`  Tutor: ${order.tutor.name} (${order.tutorId})`);
    console.log(`  Items count: ${order.items.length}`);
    for (const it of order.items) {
      console.log(`    Item ID: ${it.id}`);
      console.log(`      Product: ${it.product.name} (ProductID: ${it.productId})`);
      console.log(`      Quantity: ${it.quantity}, PriceAtTime: R$ ${it.priceAtTime}`);
      console.log(`      Item establishmentId: ${it.establishmentId}`);
    }
  }

  for (const est of establishments) {
    console.log(`\n--- Auditing Establishment: ${est.name} (${est.id}) ---`);
    const allSoldItems = await prisma.orderItem.findMany({
      where: { establishmentId: est.id },
      include: { product: true, order: true },
    });
    console.log(`allSoldItems count: ${allSoldItems.length}`);
    for (const item of allSoldItems) {
      console.log(`  ${item.product?.name}: qty ${item.quantity}, price ${item.priceAtTime}, orderStatus: ${item.order?.status}, orderCreatedAt: ${item.order?.createdAt}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
