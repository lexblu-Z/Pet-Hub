import { prisma } from '../lib/prisma';
import { AppointmentStatus } from '@prisma/client';

async function main() {
  const estUser = await prisma.user.findFirst({
    where: { email: 'pethub@gmail.com' }
  });
  console.log('Establishment User:', estUser?.id, estUser?.email);

  if (!estUser) return;

  const appts = await prisma.appointment.findMany({
    where: { establishmentId: estUser.id },
    include: { service: true }
  });
  console.log('All appointments for establishment:', JSON.stringify(appts, null, 2));

  const completed = await prisma.appointment.findMany({
    where: { establishmentId: estUser.id, status: AppointmentStatus.COMPLETED },
    include: { service: true }
  });
  console.log('Completed appointments:', completed.length);

  const orders = await prisma.order.findMany({
    include: { items: true }
  });
  console.log('Orders in DB:', JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
