import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, AppointmentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { reportsPdfService, ReportPdfMetadata } from '../services/reportsPdf.service';
import { reportsExportController } from './reportsExport.controller';

const APPROVED_ORDER_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

// Helper to check establishment access
async function ensureEstablishment(request: FastifyRequest, reply: FastifyReply) {
  const token = request.user as any;
  const userId = token?.sub || token?.id;
  if (!userId) {
    reply.status(401).send({ error: 'Não autenticado.' });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { establishmentProfile: true },
  });
  if (!user || user.role !== Role.ESTABLISHMENT) {
    reply.status(403).send({ error: 'Acesso restrito a contas de estabelecimento.' });
    return null;
  }
  return user;
}

// Helper to check professional access
async function ensureProfessional(request: FastifyRequest, reply: FastifyReply) {
  const token = request.user as any;
  const userId = token?.sub || token?.id;
  if (!userId) {
    reply.status(401).send({ error: 'Não autenticado.' });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { professionalProfile: true },
  });
  if (!user || user.role !== Role.PROFESSIONAL) {
    reply.status(403).send({ error: 'Acesso restrito a contas de profissionais.' });
    return null;
  }
  return user;
}

// Helper to parse dates with America/Sao_Paulo timezone consideration
function parseDateRange(startDate?: string, endDate?: string) {
  let start: Date;
  let end: Date;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now);
  const [currYear, currMonth] = todayStr.split('-');
  const firstDayStr = `${currYear}-${currMonth}-01`;
  const lastDay = new Date(Number(currYear), Number(currMonth), 0).getDate();
  const lastDayStr = `${currYear}-${currMonth}-${String(lastDay).padStart(2, '0')}`;

  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    start = new Date(`${startDate}T00:00:00.000-03:00`);
  } else {
    start = new Date(`${firstDayStr}T00:00:00.000-03:00`);
  }

  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    end = new Date(`${endDate}T23:59:59.999-03:00`);
  } else {
    end = new Date(`${lastDayStr}T23:59:59.999-03:00`);
  }

  return { start, end };
}

// Helper for CSV escaping and formatting
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
}

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBr(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatDateTimeBr(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
}

function formatStatusBr(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'Concluído',
    DELIVERED: 'Entregue',
    CONFIRMED: 'Confirmado',
    IN_PROGRESS: 'Em andamento',
    PENDING: 'Pendente',
    CANCELLED: 'Cancelado',
  };
  return map[status] || status;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'DELIVERED':
      return '#16a34a';
    case 'CONFIRMED':
      return '#4f46e5';
    case 'IN_PROGRESS':
      return '#2563eb';
    case 'PENDING':
      return '#d97706';
    case 'CANCELLED':
      return '#e11d48';
    default:
      return '#334155';
  }
}

export const reportsController = {
  // =========================================================================
  // 1. ESTABELECIMENTO — SERVIÇOS (RF17)
  // =========================================================================
  async getEstablishmentServices(request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      serviceType?: string;
      serviceId?: string;
      professionalId?: string;
      employeeId?: string;
      status?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { startDate, endDate, serviceType, serviceId, professionalId, employeeId, status } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const whereClause: any = {
      establishmentId: user.id,
      date: { gte: start, lte: end },
    };

    if (status && Object.values(AppointmentStatus).includes(status as any)) {
      whereClause.status = status as AppointmentStatus;
    }

    if (serviceId) {
      whereClause.serviceId = serviceId;
    }

    if (professionalId) {
      whereClause.OR = [
        { professionalId: professionalId },
        { employeeId: professionalId },
      ];
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (serviceType) {
      whereClause.service = {
        category: { equals: serviceType, mode: 'insensitive' },
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: true,
        pet: true,
        tutor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        professional: {
          select: { id: true, name: true, email: true, phone: true },
        },
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Aggregations
    const total = appointments.length;
    let completed = 0;
    let inProgress = 0;
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;

    const professionalMap = new Map<string, { id: string; name: string; roleOrSpecialty: string; total: number; completed: number }>();
    const serviceMap = new Map<string, { id: string; name: string; category: string; count: number; revenue: number }>();

    for (const apt of appointments) {
      if (apt.status === AppointmentStatus.COMPLETED) completed++;
      else if (apt.status === AppointmentStatus.IN_PROGRESS) inProgress++;
      else if (apt.status === AppointmentStatus.CONFIRMED) confirmed++;
      else if (apt.status === AppointmentStatus.PENDING) pending++;
      else if (apt.status === AppointmentStatus.CANCELLED) cancelled++;

      // Professional productivity
      const profId = apt.professionalId || apt.employeeId || 'none';
      const profName = apt.professional?.name || apt.employee?.name || 'Não atribuído';
      const profSpecialty = apt.employee?.role || 'Profissional';

      if (!professionalMap.has(profId)) {
        professionalMap.set(profId, {
          id: profId,
          name: profName,
          roleOrSpecialty: profSpecialty,
          total: 0,
          completed: 0,
        });
      }
      const pEntry = professionalMap.get(profId)!;
      pEntry.total++;
      if (apt.status === AppointmentStatus.COMPLETED) pEntry.completed++;

      // Service ranking
      const sId = apt.serviceId;
      const sName = apt.service?.name || 'Serviço';
      const sCat = apt.service?.category || 'Geral';
      const sPrice = apt.service?.price || 0;

      if (!serviceMap.has(sId)) {
        serviceMap.set(sId, { id: sId, name: sName, category: sCat, count: 0, revenue: 0 });
      }
      const sEntry = serviceMap.get(sId)!;
      sEntry.count++;
      if (apt.status === AppointmentStatus.COMPLETED) {
        sEntry.revenue += sPrice;
      }
    }

    const productivity = Array.from(professionalMap.values()).sort((a, b) => b.total - a.total);
    const servicesRanking = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);

    // Real review stats calculated from Review model
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { establishmentId: user.id },
          { professionalId: user.id },
        ],
      },
      select: { rating: true },
    });
    const reviewCount = reviews.length;
    let averageRating: number | null = null;
    if (reviewCount > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = Math.round((sum / reviewCount) * 10) / 10;
    }
    const averageRatingNotice = reviewCount > 0
      ? null
      : 'Nenhuma avaliação recebida até o momento.';

    const projectedRevenue = appointments
      .filter((a) => a.status === AppointmentStatus.PENDING || a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.IN_PROGRESS)
      .reduce((sum, a) => sum + (a.finalAmount ?? a.service?.price ?? 0), 0);
    const realizedRevenue = appointments
      .filter((a) => a.status === AppointmentStatus.COMPLETED)
      .reduce((sum, a) => sum + (a.finalAmount ?? a.service?.price ?? 0), 0);

    return reply.send({
      period: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      },
      summary: {
        total,
        completed,
        inProgress,
        confirmed,
        pending,
        cancelled,
        projectedRevenue,
        realizedRevenue,
        averageRating,
        reviewCount,
        averageRatingNotice,
      },
      productivity,
      servicesRanking,
      appointments: appointments.map((apt) => ({
        id: apt.id,
        date: apt.date,
        formattedDate: formatDateTimeBr(apt.date),
        status: apt.status,
        service: {
          id: apt.service?.id,
          name: apt.service?.name,
          category: apt.service?.category,
          price: apt.service?.price,
        },
        tutor: {
          id: apt.tutor?.id,
          name: apt.tutor?.name,
          phone: apt.tutor?.phone,
        },
        pet: {
          id: apt.pet?.id,
          name: apt.pet?.name,
          species: apt.pet?.species,
          breed: apt.pet?.breed,
        },
        assignedTo: apt.professional?.name || apt.employee?.name || 'Não atribuído',
      })),
    });
  },

  // =========================================================================
  // 2. ESTABELECIMENTO — FINANCEIRO (RF18)
  // =========================================================================
  async getEstablishmentFinancial(request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      paymentMethod?: string;
      operationType?: 'ALL' | 'SERVICES' | 'PRODUCTS';
    };
  }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { startDate, endDate, paymentMethod, operationType = 'ALL' } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const includeServices = operationType === 'ALL' || operationType === 'SERVICES';
    const includeProducts = operationType === 'ALL' || operationType === 'PRODUCTS';

    // 1. Paid Appointments Revenue (ONLY COMPLETED AND PAID appointments are accounted as realized cash)
    const paidAppointmentsWhere: any = {
      establishmentId: user.id,
      status: AppointmentStatus.COMPLETED,
      paymentStatus: 'PAID',
      date: { gte: start, lte: end },
    };

    if (paymentMethod) {
      paidAppointmentsWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
    }

    const paidAppointments = includeServices
      ? await prisma.appointment.findMany({
          where: paidAppointmentsWhere,
          include: {
            service: true,
            tutor: { select: { id: true, name: true } },
            pet: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        })
      : [];

    let grossRevenueServices = 0;
    for (const apt of paidAppointments) {
      grossRevenueServices += apt.finalAmount ?? apt.service?.price ?? 0;
    }

    // 2. Completed Services with Pending Payment (Contas a Receber / Pendências de Pagamento)
    const pendingPaymentAppointmentsWhere: any = {
      establishmentId: user.id,
      status: AppointmentStatus.COMPLETED,
      paymentStatus: 'PENDING',
      date: { gte: start, lte: end },
    };
    if (paymentMethod) {
      pendingPaymentAppointmentsWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
    }

    const pendingPaymentAppointments = includeServices
      ? await prisma.appointment.findMany({
          where: pendingPaymentAppointmentsWhere,
          include: {
            service: true,
            tutor: { select: { id: true, name: true } },
            pet: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        })
      : [];

    const pendingPaymentsServices = pendingPaymentAppointments.reduce(
      (sum, a) => sum + (a.finalAmount ?? a.service?.price ?? 0),
      0
    );
    const pendingPaymentsCount = pendingPaymentAppointments.length;

    // 3. Pending / In-progress appointments (tracked strictly as projection / pending forecast, NOT realized revenue)
    const pendingAppointmentsWhere: any = {
      establishmentId: user.id,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
      date: { gte: start, lte: end },
    };
    if (paymentMethod) {
      pendingAppointmentsWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
    }
    const pendingAppointments = includeServices
      ? await prisma.appointment.findMany({
          where: pendingAppointmentsWhere,
          include: { service: true },
        })
      : [];
    const projectedServicesRevenue = pendingAppointments.reduce(
      (sum, a) => sum + (a.finalAmount ?? a.service?.price ?? 0),
      0
    );

    // 4. Refunded / Estornados Services (Appointments cancelled that were already paid)
    const refundedAppointmentsWhere: any = {
      establishmentId: user.id,
      paymentStatus: 'REFUNDED',
      date: { gte: start, lte: end },
    };
    if (paymentMethod) {
      refundedAppointmentsWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
    }
    const refundedAppointments = includeServices
      ? await prisma.appointment.findMany({
          where: refundedAppointmentsWhere,
          include: {
            service: true,
            tutor: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        })
      : [];
    let refundedRevenueServices = 0;
    for (const apt of refundedAppointments) {
      refundedRevenueServices += apt.finalAmount ?? apt.service?.price ?? 0;
    }

    // 5. Completed Orders Revenue (from OrderItems of this establishment)
    const orderItemsWhere: any = {
      establishmentId: user.id,
      order: {
        status: { in: APPROVED_ORDER_STATUSES },
        createdAt: { gte: start, lte: end },
      },
    };

    if (paymentMethod) {
      orderItemsWhere.order = {
        ...orderItemsWhere.order,
        paymentMethod: { equals: paymentMethod, mode: 'insensitive' },
      };
    }

    const orderItems = includeProducts
      ? await prisma.orderItem.findMany({
          where: orderItemsWhere,
          include: {
            product: true,
            order: {
              include: {
                tutor: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    let grossRevenueProducts = 0;
    const paymentMethodBreakdown: Record<string, number> = {
      PIX: 0,
      CREDIT_CARD: 0,
      DEBIT_CARD: 0,
      CASH: 0,
      OTHER: 0,
    };

    for (const item of orderItems) {
      const itemTotal = item.quantity * item.priceAtTime;
      grossRevenueProducts += itemTotal;

      const rawMethod = (item.order?.paymentMethod || '').toUpperCase();
      if (rawMethod.includes('PIX')) paymentMethodBreakdown.PIX += itemTotal;
      else if (rawMethod.includes('CRÉDITO') || rawMethod.includes('CREDIT')) paymentMethodBreakdown.CREDIT_CARD += itemTotal;
      else if (rawMethod.includes('DÉBITO') || rawMethod.includes('DEBIT')) paymentMethodBreakdown.DEBIT_CARD += itemTotal;
      else if (rawMethod.includes('DINHEIRO') || rawMethod.includes('CASH')) paymentMethodBreakdown.CASH += itemTotal;
      else paymentMethodBreakdown.OTHER += itemTotal;
    }

    // ONLY realized/paid service payments enter the payment breakdown
    for (const apt of paidAppointments) {
      const aptVal = apt.finalAmount ?? apt.service?.price ?? 0;
      const rawMethod = (apt.paymentMethod || '').toUpperCase();
      if (rawMethod.includes('PIX')) paymentMethodBreakdown.PIX += aptVal;
      else if (rawMethod.includes('CRÉDITO') || rawMethod.includes('CREDIT')) paymentMethodBreakdown.CREDIT_CARD += aptVal;
      else if (rawMethod.includes('DÉBITO') || rawMethod.includes('DEBIT')) paymentMethodBreakdown.DEBIT_CARD += aptVal;
      else if (rawMethod.includes('DINHEIRO') || rawMethod.includes('CASH')) paymentMethodBreakdown.CASH += aptVal;
      else paymentMethodBreakdown.OTHER += aptVal;
    }

    // 6. Cancelled / Refunded Orders
    const cancelledOrderItemsWhere: any = {
      establishmentId: user.id,
      order: {
        status: OrderStatus.CANCELLED,
        createdAt: { gte: start, lte: end },
      },
    };

    if (paymentMethod) {
      cancelledOrderItemsWhere.order = {
        ...cancelledOrderItemsWhere.order,
        paymentMethod: { equals: paymentMethod, mode: 'insensitive' },
      };
    }

    const cancelledOrderItems = includeProducts
      ? await prisma.orderItem.findMany({
          where: cancelledOrderItemsWhere,
          include: {
            product: true,
            order: {
              include: {
                tutor: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    let refundedRevenueProducts = 0;
    for (const item of cancelledOrderItems) {
      refundedRevenueProducts += item.quantity * item.priceAtTime;
    }

    const totalGrossRevenue = grossRevenueServices + grossRevenueProducts + refundedRevenueProducts + refundedRevenueServices;
    const refunds = refundedRevenueProducts + refundedRevenueServices;
    const discounts = 0; // No real global discount engine stored; reported honestly as 0.00
    const netRevenue = totalGrossRevenue - refunds - discounts;
    const netRevenueProducts = (grossRevenueProducts + refundedRevenueProducts) - refunds - discounts;

    // Daily cash flow aggregation (strictly for PAID and received cash)
    const cashFlowMap = new Map<string, { date: string; servicesRevenue: number; productsRevenue: number; total: number; count: number }>();

    for (const apt of paidAppointments) {
      const dStr = formatDateTimeBr(apt.date).split(' ')[0] || apt.date.toISOString().slice(0, 10);
      if (!cashFlowMap.has(dStr)) {
        cashFlowMap.set(dStr, { date: dStr, servicesRevenue: 0, productsRevenue: 0, total: 0, count: 0 });
      }
      const entry = cashFlowMap.get(dStr)!;
      const val = apt.finalAmount ?? apt.service?.price ?? 0;
      entry.servicesRevenue += val;
      entry.total += val;
      entry.count++;
    }

    for (const item of orderItems) {
      const dStr = formatDateTimeBr(item.order.createdAt).split(' ')[0] || item.order.createdAt.toISOString().slice(0, 10);
      if (!cashFlowMap.has(dStr)) {
        cashFlowMap.set(dStr, { date: dStr, servicesRevenue: 0, productsRevenue: 0, total: 0, count: 0 });
      }
      const entry = cashFlowMap.get(dStr)!;
      const val = item.quantity * item.priceAtTime;
      entry.productsRevenue += val;
      entry.total += val;
      entry.count++;
    }

    const cashFlow = Array.from(cashFlowMap.values());

    return reply.send({
      period: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      },
      summary: {
        totalGrossRevenue,
        grossRevenueServices,
        grossRevenueProducts: grossRevenueProducts + refundedRevenueProducts,
        refunds,
        refundsServices: refundedRevenueServices,
        refundsProducts: refundedRevenueProducts,
        totalRefundedAmount: refunds,
        discounts,
        netRevenueProducts,
        netRevenue,
        completedServicesCount: paidAppointments.length + pendingPaymentAppointments.length,
        paidServicesCount: paidAppointments.length,
        pendingPaymentsCount,
        pendingPaymentsServices,
        pendingServicesCount: pendingAppointments.length,
        projectedServicesRevenue,
        soldProductsCount: orderItems.reduce((acc, i) => acc + i.quantity, 0),
        cancelledProductsCount: cancelledOrderItems.reduce((acc, i) => acc + i.quantity, 0),
        ordersCount: new Set(orderItems.map((i) => i.orderId)).size,
        cancelledOrdersCount: new Set(cancelledOrderItems.map((i) => i.orderId)).size,
      },
      paymentMethodBreakdown,
      cashFlow,
      transactions: [
        ...paidAppointments.map((apt) => ({
          id: apt.id,
          date: apt.date,
          formattedDate: formatDateTimeBr(apt.date),
          type: 'SERVICO',
          status: apt.status,
          paymentStatus: 'PAID',
          description: `${apt.service?.name || 'Serviço'} (Pago)`,
          clientName: apt.tutor?.name || 'Cliente',
          paymentMethod: apt.paymentMethod || 'Presencial',
          amount: apt.finalAmount ?? apt.service?.price ?? 0,
        })),
        ...pendingPaymentAppointments.map((apt) => ({
          id: apt.id,
          date: apt.date,
          formattedDate: formatDateTimeBr(apt.date),
          type: 'SERVICO_PENDENTE',
          status: apt.status,
          paymentStatus: 'PENDING',
          description: `${apt.service?.name || 'Serviço'} (Pagamento Pendente)`,
          clientName: apt.tutor?.name || 'Cliente',
          paymentMethod: apt.paymentMethod || 'Presencial',
          amount: apt.finalAmount ?? apt.service?.price ?? 0,
        })),
        ...refundedAppointments.map((apt) => ({
          id: `refund-apt-${apt.id}`,
          date: apt.date,
          formattedDate: formatDateTimeBr(apt.date),
          type: 'ESTORNO',
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
          description: `Estorno: ${apt.service?.name || 'Serviço Cancelado'}`,
          clientName: apt.tutor?.name || 'Cliente',
          paymentMethod: apt.paymentMethod || 'Estorno',
          amount: -(apt.finalAmount ?? apt.service?.price ?? 0),
        })),
        ...orderItems.map((item) => ({
          id: item.id,
          date: item.createdAt,
          formattedDate: formatDateTimeBr(item.createdAt),
          type: 'PRODUTO',
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          description: `${item.product?.name} (${item.quantity}x)`,
          clientName: item.order?.tutor?.name || 'Comprador',
          paymentMethod: item.order?.paymentMethod || 'Não informado',
          amount: item.quantity * item.priceAtTime,
        })),
        ...cancelledOrderItems.map((item) => ({
          id: `refund-${item.id}`,
          date: item.order?.refundedAt || item.createdAt,
          formattedDate: formatDateTimeBr(item.order?.refundedAt || item.createdAt),
          type: 'REEMBOLSO',
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
          description: `Cancelamento: ${item.product?.name} (${item.quantity}x)`,
          clientName: item.order?.tutor?.name || 'Comprador',
          paymentMethod: item.order?.paymentMethod ? `${item.order.paymentMethod} (Simulado)` : 'Estorno Simulado',
          amount: -(item.quantity * item.priceAtTime),
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    });
  },

  // =========================================================================
  // 3. ESTABELECIMENTO — CLIENTES & PETS (RF19)
  // =========================================================================
  async getEstablishmentCustomers(request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      species?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { startDate, endDate, species } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    // Fetch appointments in this establishment
    const appointments = await prisma.appointment.findMany({
      where: {
        establishmentId: user.id,
        date: { gte: start, lte: end },
      },
      include: {
        tutor: true,
        pet: true,
        service: true,
      },
      orderBy: { date: 'desc' },
    });

    // Fetch order items in this establishment
    const orderItems = await prisma.orderItem.findMany({
      where: {
        establishmentId: user.id,
        createdAt: { gte: start, lte: end },
      },
      include: {
        order: {
          include: { tutor: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate unique tutors
    const tutorMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      phone: string;
      totalAppointments: number;
      totalOrders: number;
      lastVisitDate: Date | null;
      pets: Set<string>;
    }>();

    for (const apt of appointments) {
      if (!apt.tutor) continue;
      const tId = apt.tutor.id;
      if (!tutorMap.has(tId)) {
        tutorMap.set(tId, {
          id: tId,
          name: apt.tutor.name,
          email: apt.tutor.email,
          phone: apt.tutor.phone || 'Não informado',
          totalAppointments: 0,
          totalOrders: 0,
          lastVisitDate: null,
          pets: new Set(),
        });
      }
      const entry = tutorMap.get(tId)!;
      entry.totalAppointments++;
      if (apt.pet?.name) entry.pets.add(apt.pet.name);
      if (!entry.lastVisitDate || new Date(apt.date) > new Date(entry.lastVisitDate)) {
        entry.lastVisitDate = new Date(apt.date);
      }
    }

    for (const item of orderItems) {
      if (!item.order?.tutor) continue;
      const tId = item.order.tutor.id;
      if (!tutorMap.has(tId)) {
        tutorMap.set(tId, {
          id: tId,
          name: item.order.tutor.name,
          email: item.order.tutor.email,
          phone: item.order.tutor.phone || 'Não informado',
          totalAppointments: 0,
          totalOrders: 0,
          lastVisitDate: null,
          pets: new Set(),
        });
      }
      const entry = tutorMap.get(tId)!;
      entry.totalOrders++;
      if (!entry.lastVisitDate || new Date(item.createdAt) > new Date(entry.lastVisitDate)) {
        entry.lastVisitDate = new Date(item.createdAt);
      }
    }

    // Aggregate unique pets
    const petMap = new Map<string, {
      id: string;
      name: string;
      species: string;
      breed: string;
      tutorName: string;
      totalAppointments: number;
      lastAppointmentDate: Date | null;
      lastServiceName: string;
    }>();

    const speciesCountMap = new Map<string, number>();

    for (const apt of appointments) {
      if (!apt.pet) continue;
      if (species && apt.pet.species?.toLowerCase() !== species.toLowerCase()) {
        continue;
      }

      const pId = apt.pet.id;
      const petSpecies = apt.pet.species || 'Outro';

      speciesCountMap.set(petSpecies, (speciesCountMap.get(petSpecies) || 0) + 1);

      if (!petMap.has(pId)) {
        petMap.set(pId, {
          id: pId,
          name: apt.pet.name,
          species: petSpecies,
          breed: apt.pet.breed || 'Não informada',
          tutorName: apt.tutor?.name || 'Não informado',
          totalAppointments: 0,
          lastAppointmentDate: null,
          lastServiceName: '',
        });
      }

      const pEntry = petMap.get(pId)!;
      pEntry.totalAppointments++;
      if (!pEntry.lastAppointmentDate || new Date(apt.date) > new Date(pEntry.lastAppointmentDate)) {
        pEntry.lastAppointmentDate = new Date(apt.date);
        pEntry.lastServiceName = apt.service?.name || 'Serviço';
      }
    }

    const customers = Array.from(tutorMap.values()).map((t) => ({
      ...t,
      pets: Array.from(t.pets),
      formattedLastVisit: formatDateTimeBr(t.lastVisitDate),
    }));

    const pets = Array.from(petMap.values()).map((p) => ({
      ...p,
      formattedLastAppointment: formatDateTimeBr(p.lastAppointmentDate),
    }));

    const speciesDistribution = Array.from(speciesCountMap.entries()).map(([spec, count]) => ({
      species: spec,
      count,
    }));

    return reply.send({
      summary: {
        totalUniqueCustomers: customers.length,
        totalUniquePets: pets.length,
        speciesDistribution,
      },
      customers,
      pets,
    });
  },

  // =========================================================================
  // 4. ESTABELECIMENTO — ESTOQUE (RF20)
  // =========================================================================
  async getEstablishmentInventory(request: FastifyRequest<{
    Querystring: {
      category?: string;
      lowStockOnly?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { category, lowStockOnly } = request.query;

    const whereClause: any = {
      establishmentId: user.id,
    };

    if (category) {
      whereClause.category = { equals: category, mode: 'insensitive' };
    }

    if (lowStockOnly === 'true') {
      whereClause.stock = { lte: 5 };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        orderItems: {
          where: {
            order: { status: { not: OrderStatus.CANCELLED } },
          },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    let totalStockUnits = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categorySet = new Set<string>();

    const formattedProducts = products.map((p) => {
      const salesVolume = p.orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
      const inventoryValue = p.stock * p.price;

      totalStockUnits += p.stock;
      totalStockValue += inventoryValue;

      if (p.stock === 0) outOfStockCount++;
      else if (p.stock <= 5) lowStockCount++;

      if (p.category) categorySet.add(p.category);

      let status = 'NORMAL';
      if (p.stock === 0) status = 'OUT_OF_STOCK';
      else if (p.stock <= 5) status = 'LOW_STOCK';

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'Geral',
        price: p.price,
        stock: p.stock,
        salesVolume,
        inventoryValue,
        status,
        photo: p.photo,
      };
    });

    return reply.send({
      summary: {
        totalProducts: formattedProducts.length,
        totalStockUnits,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
        categories: Array.from(categorySet),
      },
      products: formattedProducts,
    });
  },

  // =========================================================================
  // =========================================================================
  // 5. ESTABELECIMENTO — EXPORTAÇÃO (PDF / CSV)
  // =========================================================================
  exportEstablishment: reportsExportController.exportEstablishment,
  exportEstablishmentCsv: reportsExportController.exportEstablishment,


  // =========================================================================
  // 6. PROFISSIONAL — SERVIÇOS (RF17 ADAPTADO)
  // =========================================================================
  async getProfessionalServices(request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      serviceType?: string;
      status?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { startDate, endDate, serviceType, status } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    // STRICT ISOLATION: ONLY appointments belonging to this professional
    const whereClause: any = {
      OR: [
        { professionalId: user.id },
        { service: { professionalId: user.id } },
      ],
      date: { gte: start, lte: end },
    };

    if (status && Object.values(AppointmentStatus).includes(status as any)) {
      whereClause.status = status as AppointmentStatus;
    }

    if (serviceType) {
      whereClause.service = {
        category: { equals: serviceType, mode: 'insensitive' },
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: true,
        pet: true,
        tutor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        establishment: {
          select: {
            id: true,
            name: true,
            establishmentProfile: { select: { businessName: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const total = appointments.length;
    let completed = 0;
    let inProgress = 0;
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;

    const categoryMap = new Map<string, { category: string; count: number; completed: number }>();

    for (const apt of appointments) {
      if (apt.status === AppointmentStatus.COMPLETED) completed++;
      else if (apt.status === AppointmentStatus.IN_PROGRESS) inProgress++;
      else if (apt.status === AppointmentStatus.CONFIRMED) confirmed++;
      else if (apt.status === AppointmentStatus.PENDING) pending++;
      else if (apt.status === AppointmentStatus.CANCELLED) cancelled++;

      const cat = apt.service?.category || 'Geral';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { category: cat, count: 0, completed: 0 });
      }
      const cEntry = categoryMap.get(cat)!;
      cEntry.count++;
      if (apt.status === AppointmentStatus.COMPLETED) cEntry.completed++;
    }

    const servicesByCategory = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

    return reply.send({
      period: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      },
      summary: {
        total,
        completed,
        inProgress,
        confirmed,
        pending,
        cancelled,
        averageRating: null,
        averageRatingNotice: 'Média de avaliações não disponível: o sistema atual não possui modelo de avaliações persistido.',
      },
      servicesByCategory,
      appointments: appointments.map((apt) => ({
        id: apt.id,
        date: apt.date,
        formattedDate: formatDateTimeBr(apt.date),
        status: apt.status,
        service: {
          id: apt.service?.id,
          name: apt.service?.name,
          category: apt.service?.category,
          price: apt.service?.price,
        },
        tutor: {
          id: apt.tutor?.id,
          name: apt.tutor?.name,
          phone: apt.tutor?.phone,
        },
        pet: {
          id: apt.pet?.id,
          name: apt.pet?.name,
          species: apt.pet?.species,
          breed: apt.pet?.breed,
        },
        establishmentName: apt.establishment?.establishmentProfile?.businessName || apt.establishment?.name || 'Local',
      })),
    });
  },

  // =========================================================================
  // 7. PROFISSIONAL — FINANCEIRO (RF18 ADAPTADO)
  // =========================================================================
  async getProfessionalFinancial(request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { startDate, endDate } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    // STRICT ISOLATION: ONLY completed and paid appointments attended by this professional count as gross cash revenue
    const paidAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { professionalId: user.id },
          { service: { professionalId: user.id } },
        ],
        status: AppointmentStatus.COMPLETED,
        paymentStatus: 'PAID',
        date: { gte: start, lte: end },
      },
      include: {
        service: true,
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const pendingPaymentAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { professionalId: user.id },
          { service: { professionalId: user.id } },
        ],
        status: AppointmentStatus.COMPLETED,
        paymentStatus: 'PENDING',
        date: { gte: start, lte: end },
      },
      include: {
        service: true,
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    let grossRevenue = 0;
    for (const apt of paidAppointments) {
      grossRevenue += apt.finalAmount ?? apt.service?.price ?? 0;
    }

    let pendingRevenue = 0;
    for (const apt of pendingPaymentAppointments) {
      pendingRevenue += apt.finalAmount ?? apt.service?.price ?? 0;
    }

    const paidCount = paidAppointments.length;
    const completedCount = paidCount + pendingPaymentAppointments.length;
    const averageTicket = paidCount > 0 ? grossRevenue / paidCount : 0;

    const commissionNotice =
      'No modelo de dados atual do PetHub, a porcentagem de comissão e repasse contratual não está configurada no cadastro do profissional. O valor informado representa o faturamento bruto dos serviços concluídos diretamente por você com recebimento confirmado.';

    return reply.send({
      period: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      },
      summary: {
        grossRevenue,
        pendingRevenue,
        completedServicesCount: completedCount,
        paidServicesCount: paidCount,
        pendingServicesCount: pendingPaymentAppointments.length,
        averageTicket,
        commissionNotice,
      },
      transactions: [
        ...paidAppointments.map((apt) => ({
          id: apt.id,
          date: apt.date,
          formattedDate: formatDateTimeBr(apt.date),
          serviceName: apt.service?.name || 'Serviço',
          clientName: apt.tutor?.name || 'Cliente',
          petName: apt.pet?.name || 'Pet',
          amount: apt.finalAmount ?? apt.service?.price ?? 0,
          paymentStatus: 'PAID',
        })),
        ...pendingPaymentAppointments.map((apt) => ({
          id: apt.id,
          date: apt.date,
          formattedDate: formatDateTimeBr(apt.date),
          serviceName: `${apt.service?.name || 'Serviço'} (Pagamento Pendente)`,
          clientName: apt.tutor?.name || 'Cliente',
          petName: apt.pet?.name || 'Pet',
          amount: apt.finalAmount ?? apt.service?.price ?? 0,
          paymentStatus: 'PENDING',
        })),
      ],
    });
  },

  // =========================================================================
  // 8. PROFISSIONAL — CLIENTES & PETS (RF19 ADAPTADO)
  // =========================================================================
  async getProfessionalCustomers(request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      species?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { startDate, endDate, species } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    // STRICT ISOLATION: ONLY appointments attended by this professional
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { professionalId: user.id },
          { service: { professionalId: user.id } },
        ],
        date: { gte: start, lte: end },
      },
      include: {
        tutor: true,
        pet: true,
        service: true,
      },
      orderBy: { date: 'desc' },
    });

    const tutorMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      phone: string;
      totalAppointments: number;
      lastVisitDate: Date | null;
      pets: Set<string>;
    }>();

    const petMap = new Map<string, {
      id: string;
      name: string;
      species: string;
      breed: string;
      tutorName: string;
      totalAppointments: number;
      lastAppointmentDate: Date | null;
      lastServiceName: string;
    }>();

    const speciesCountMap = new Map<string, number>();

    for (const apt of appointments) {
      // Tutor
      if (apt.tutor) {
        const tId = apt.tutor.id;
        if (!tutorMap.has(tId)) {
          tutorMap.set(tId, {
            id: tId,
            name: apt.tutor.name,
            email: apt.tutor.email,
            phone: apt.tutor.phone || 'Não informado',
            totalAppointments: 0,
            lastVisitDate: null,
            pets: new Set(),
          });
        }
        const tEntry = tutorMap.get(tId)!;
        tEntry.totalAppointments++;
        if (apt.pet?.name) tEntry.pets.add(apt.pet.name);
        if (!tEntry.lastVisitDate || new Date(apt.date) > new Date(tEntry.lastVisitDate)) {
          tEntry.lastVisitDate = new Date(apt.date);
        }
      }

      // Pet
      if (apt.pet) {
        if (species && apt.pet.species?.toLowerCase() !== species.toLowerCase()) {
          continue;
        }

        const pId = apt.pet.id;
        const petSpecies = apt.pet.species || 'Outro';
        speciesCountMap.set(petSpecies, (speciesCountMap.get(petSpecies) || 0) + 1);

        if (!petMap.has(pId)) {
          petMap.set(pId, {
            id: pId,
            name: apt.pet.name,
            species: petSpecies,
            breed: apt.pet.breed || 'Não informada',
            tutorName: apt.tutor?.name || 'Não informado',
            totalAppointments: 0,
            lastAppointmentDate: null,
            lastServiceName: '',
          });
        }
        const pEntry = petMap.get(pId)!;
        pEntry.totalAppointments++;
        if (!pEntry.lastAppointmentDate || new Date(apt.date) > new Date(pEntry.lastAppointmentDate)) {
          pEntry.lastAppointmentDate = new Date(apt.date);
          pEntry.lastServiceName = apt.service?.name || 'Serviço';
        }
      }
    }

    const customers = Array.from(tutorMap.values()).map((t) => ({
      ...t,
      pets: Array.from(t.pets),
      formattedLastVisit: formatDateTimeBr(t.lastVisitDate),
    }));

    const pets = Array.from(petMap.values()).map((p) => ({
      ...p,
      formattedLastAppointment: formatDateTimeBr(p.lastAppointmentDate),
    }));

    const speciesDistribution = Array.from(speciesCountMap.entries()).map(([spec, count]) => ({
      species: spec,
      count,
    }));

    return reply.send({
      summary: {
        totalUniqueCustomers: customers.length,
        totalUniquePets: pets.length,
        speciesDistribution,
      },
      customers,
      pets,
    });
  },

  // =========================================================================
  // 9. PROFISSIONAL — EXPORTAÇÃO (PDF / CSV)
  // =========================================================================
  exportProfessional: reportsExportController.exportProfessional,
  exportProfessionalCsv: reportsExportController.exportProfessional,

};
