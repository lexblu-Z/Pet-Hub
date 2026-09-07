import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppointmentStatus, OrderStatus } from '@prisma/client';

const financeQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date();

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'week') {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  } else if (period === 'custom' && startDate) {
    start = new Date(startDate);
    end = endDate ? new Date(endDate) : new Date();
  } else {
    // Default 30 days
    start = new Date(now);
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export const adminFinanceController = {
  async getOverview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = financeQuerySchema.parse(request.query);
      const { start, end } = getDateRange(query.period, query.startDate, query.endDate);

      // 1. Completed Appointments in period
      const appointments = await prisma.appointment.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: {
          service: { select: { id: true, name: true, price: true } },
          tutor: { select: { id: true, name: true, email: true } },
          establishment: { select: { id: true, name: true } },
          professional: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      });

      // 2. Orders in period
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        include: {
          tutor: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true } },
              establishment: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 3. Cashback Redeemed in period
      const cashbackRedeemed = await prisma.cashbackTransaction.aggregate({
        where: {
          type: 'REDEEMED',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });

      // Calculations
      let completedAppointmentsTotal = 0;
      let pendingAppointmentsTotal = 0;
      let cancelledAppointmentsTotal = 0;
      let completedAppointmentsCount = 0;
      let pendingAppointmentsCount = 0;
      let cancelledAppointmentsCount = 0;

      appointments.forEach((app) => {
        const price = app.service?.price || 0;
        if (app.status === AppointmentStatus.COMPLETED) {
          completedAppointmentsTotal += price;
          completedAppointmentsCount++;
        } else if (app.status === AppointmentStatus.PENDING) {
          pendingAppointmentsTotal += price;
          pendingAppointmentsCount++;
        } else if (app.status === AppointmentStatus.CANCELLED) {
          cancelledAppointmentsTotal += price;
          cancelledAppointmentsCount++;
        }
      });

      let paidOrdersTotal = 0;
      let pendingOrdersTotal = 0;
      let cancelledOrdersTotal = 0;
      let paidOrdersCount = 0;
      let pendingOrdersCount = 0;
      let cancelledOrdersCount = 0;

      // Payment method breakdown
      const paymentMethodsBreakdown: Record<string, { count: number; total: number }> = {
        PIX: { count: 0, total: 0 },
        CREDIT_CARD: { count: 0, total: 0 },
        DEBIT_CARD: { count: 0, total: 0 },
        CASH: { count: 0, total: 0 },
        OUTROS: { count: 0, total: 0 },
      };

      orders.forEach((ord) => {
        const amount = ord.totalAmount || 0;
        const isPaid = ord.status === OrderStatus.COMPLETED || ord.status === OrderStatus.DELIVERED;
        const isPending = ord.status === OrderStatus.PENDING || ord.status === OrderStatus.PREPARING;
        const isCancelled = ord.status === OrderStatus.CANCELLED;

        if (isPaid) {
          paidOrdersTotal += amount;
          paidOrdersCount++;
        } else if (isPending) {
          pendingOrdersTotal += amount;
          pendingOrdersCount++;
        } else if (isCancelled) {
          cancelledOrdersTotal += amount;
          cancelledOrdersCount++;
        }

        // Aggregate by payment method
        const method = (ord.paymentMethod || 'OUTROS').toUpperCase();
        let key = 'OUTROS';
        if (method.includes('PIX')) key = 'PIX';
        else if (method.includes('CREDIT') || method.includes('CRÉDITO') || method.includes('CREDITO')) key = 'CREDIT_CARD';
        else if (method.includes('DEBIT') || method.includes('DÉBITO') || method.includes('DEBITO')) key = 'DEBIT_CARD';
        else if (method.includes('CASH') || method.includes('DINHEIRO')) key = 'CASH';

        paymentMethodsBreakdown[key].count += 1;
        paymentMethodsBreakdown[key].total += amount;
      });

      const grossRevenue = completedAppointmentsTotal + paidOrdersTotal;
      const totalCashbackUsed = cashbackRedeemed._sum.amount || 0;
      const platformFeeRate = 0.10; // 10% platform fee
      const platformFees = Number((grossRevenue * platformFeeRate).toFixed(2));
      const netRevenue = Number(Math.max(0, grossRevenue - platformFees - totalCashbackUsed).toFixed(2));

      // Build unified transaction feed for the table
      const transactions: any[] = [];

      appointments.slice(0, 50).forEach((app) => {
        transactions.push({
          id: app.id,
          code: `#AGD-${app.id.slice(0, 6).toUpperCase()}`,
          type: 'AGENDAMENTO',
          customerName: app.tutor.name,
          customerEmail: app.tutor.email,
          providerName: app.establishment?.name || app.professional?.name || 'Não informado',
          description: app.service?.name || 'Serviço',
          amount: app.service?.price || 0,
          paymentMethod: 'ONLINE',
          status: app.status,
          date: app.date,
        });
      });

      orders.slice(0, 50).forEach((ord) => {
        transactions.push({
          id: ord.id,
          code: `#PED-${ord.id.slice(0, 6).toUpperCase()}`,
          type: 'PEDIDO',
          customerName: ord.tutor.name,
          customerEmail: ord.tutor.email,
          providerName: ord.items[0]?.establishment?.name || 'Loja PetHub',
          description: `${ord.items.length} item(ns)`,
          amount: ord.totalAmount,
          paymentMethod: ord.paymentMethod || 'PIX',
          status: ord.status,
          date: ord.createdAt,
        });
      });

      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return reply.send({
        period: query.period,
        dateRange: { start, end },
        kpis: {
          grossRevenue,
          netRevenue,
          platformFees,
          totalCashbackUsed,
          completedCount: completedAppointmentsCount + paidOrdersCount,
          pendingAmount: pendingAppointmentsTotal + pendingOrdersTotal,
          pendingCount: pendingAppointmentsCount + pendingOrdersCount,
          cancelledAmount: cancelledAppointmentsTotal + cancelledOrdersTotal,
          cancelledCount: cancelledAppointmentsCount + cancelledOrdersCount,
        },
        paymentMethods: paymentMethodsBreakdown,
        transactions: transactions.slice(0, query.limit),
        totalTransactions: transactions.length,
      });
    } catch (error: any) {
      request.log.error(error, 'Error fetching financial overview');
      return reply.status(500).send({ error: 'Erro ao consolidar dados financeiros.' });
    }
  },
};
