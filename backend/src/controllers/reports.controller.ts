import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, AppointmentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

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

  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    // Start of the day in America/Sao_Paulo (UTC-3)
    start = new Date(`${startDate}T00:00:00.000-03:00`);
  } else {
    // Default: 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    start = d;
  }

  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    // End of the day in America/Sao_Paulo (UTC-3)
    end = new Date(`${endDate}T23:59:59.999-03:00`);
  } else {
    end = new Date();
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
      whereClause.professionalId = professionalId;
    }

    if (employeeId) {
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

    // Notice: Review model does not exist in Prisma schema
    const averageRatingNotice = 'Média de avaliações não disponível: o sistema atual não possui modelo de avaliações persistido para agendamentos.';

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
    };
  }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { startDate, endDate, paymentMethod } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    // 1. Completed Appointments Revenue
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        establishmentId: user.id,
        status: AppointmentStatus.COMPLETED,
        date: { gte: start, lte: end },
      },
      include: {
        service: true,
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    let grossRevenueServices = 0;
    for (const apt of completedAppointments) {
      grossRevenueServices += apt.service?.price || 0;
    }

    // 2. Completed Orders Revenue (from OrderItems of this establishment)
    const orderItemsWhere: any = {
      establishmentId: user.id,
      order: {
        status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.PAID] },
        createdAt: { gte: start, lte: end },
      },
    };

    if (paymentMethod) {
      orderItemsWhere.order = {
        ...orderItemsWhere.order,
        paymentMethod: { equals: paymentMethod, mode: 'insensitive' },
      };
    }

    const orderItems = await prisma.orderItem.findMany({
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
    });

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

    const totalGrossRevenue = grossRevenueServices + grossRevenueProducts;
    const discounts = 0; // No real global discount engine stored; reported honestly as 0.00
    const netRevenue = totalGrossRevenue - discounts;

    // Daily cash flow aggregation
    const cashFlowMap = new Map<string, { date: string; servicesRevenue: number; productsRevenue: number; total: number; count: number }>();

    for (const apt of completedAppointments) {
      const dStr = formatDateTimeBr(apt.date).split(' ')[0] || apt.date.toISOString().slice(0, 10);
      if (!cashFlowMap.has(dStr)) {
        cashFlowMap.set(dStr, { date: dStr, servicesRevenue: 0, productsRevenue: 0, total: 0, count: 0 });
      }
      const entry = cashFlowMap.get(dStr)!;
      const val = apt.service?.price || 0;
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
        grossRevenueProducts,
        discounts,
        netRevenue,
        completedServicesCount: completedAppointments.length,
        soldProductsCount: orderItems.reduce((acc, i) => acc + i.quantity, 0),
        ordersCount: new Set(orderItems.map((i) => i.orderId)).size,
      },
      paymentMethodBreakdown,
      cashFlow,
      transactions: [
        ...completedAppointments.map((apt) => ({
          id: apt.id,
          date: apt.date,
          formattedDate: formatDateTimeBr(apt.date),
          type: 'SERVICO',
          description: apt.service?.name || 'Serviço Concluído',
          clientName: apt.tutor?.name || 'Cliente',
          paymentMethod: 'Presencial / Concluído',
          amount: apt.service?.price || 0,
        })),
        ...orderItems.map((item) => ({
          id: item.id,
          date: item.createdAt,
          formattedDate: formatDateTimeBr(item.createdAt),
          type: 'PRODUTO',
          description: `${item.product?.name} (${item.quantity}x)`,
          clientName: item.order?.tutor?.name || 'Comprador',
          paymentMethod: item.order?.paymentMethod || 'Não informado',
          amount: item.quantity * item.priceAtTime,
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
  // 5. ESTABELECIMENTO — EXPORTAÇÃO CSV
  // =========================================================================
  async exportEstablishmentCsv(request: FastifyRequest<{
    Querystring: {
      type: 'services' | 'financial' | 'customers' | 'inventory';
      startDate?: string;
      endDate?: string;
      serviceType?: string;
      status?: string;
      paymentMethod?: string;
      category?: string;
      species?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { type, startDate, endDate, serviceType, status, paymentMethod, category, species } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel compatibility
    const filenameDate = new Date().toISOString().slice(0, 10);

    if (type === 'services') {
      const whereClause: any = {
        establishmentId: user.id,
        date: { gte: start, lte: end },
      };
      if (status && Object.values(AppointmentStatus).includes(status as any)) {
        whereClause.status = status as AppointmentStatus;
      }
      if (serviceType) {
        whereClause.service = { category: { equals: serviceType, mode: 'insensitive' } };
      }

      const list = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          service: true,
          pet: true,
          tutor: true,
          professional: true,
          employee: true,
        },
        orderBy: { date: 'desc' },
      });

      const headers = ['ID', 'Data e Hora', 'Status', 'Serviço', 'Categoria', 'Valor (R$)', 'Cliente / Tutor', 'Pet', 'Espécie', 'Responsável'];
      csvContent += headers.join(';') + '\r\n';

      for (const apt of list) {
        const row = [
          escapeCsv(apt.id),
          escapeCsv(formatDateTimeBr(apt.date)),
          escapeCsv(apt.status),
          escapeCsv(apt.service?.name || '-'),
          escapeCsv(apt.service?.category || '-'),
          escapeCsv(formatCurrency(apt.service?.price || 0)),
          escapeCsv(apt.tutor?.name || '-'),
          escapeCsv(apt.pet?.name || '-'),
          escapeCsv(apt.pet?.species || '-'),
          escapeCsv(apt.professional?.name || apt.employee?.name || 'Não atribuído'),
        ];
        csvContent += row.join(';') + '\r\n';
      }
    } else if (type === 'financial') {
      const appointments = await prisma.appointment.findMany({
        where: {
          establishmentId: user.id,
          status: AppointmentStatus.COMPLETED,
          date: { gte: start, lte: end },
        },
        include: { service: true, tutor: true },
        orderBy: { date: 'desc' },
      });

      const orderItems = await prisma.orderItem.findMany({
        where: {
          establishmentId: user.id,
          order: {
            status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.PAID] },
            createdAt: { gte: start, lte: end },
          },
        },
        include: { product: true, order: { include: { tutor: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const headers = ['Tipo', 'Data', 'Descrição / Item', 'Cliente', 'Forma de Pagamento', 'Valor Bruto (R$)'];
      csvContent += headers.join(';') + '\r\n';

      for (const apt of appointments) {
        const row = [
          escapeCsv('SERVIÇO'),
          escapeCsv(formatDateTimeBr(apt.date)),
          escapeCsv(apt.service?.name || 'Serviço'),
          escapeCsv(apt.tutor?.name || '-'),
          escapeCsv('Presencial'),
          escapeCsv(formatCurrency(apt.service?.price || 0)),
        ];
        csvContent += row.join(';') + '\r\n';
      }

      for (const item of orderItems) {
        const row = [
          escapeCsv('PRODUTO'),
          escapeCsv(formatDateTimeBr(item.createdAt)),
          escapeCsv(`${item.product?.name} (${item.quantity}x)`),
          escapeCsv(item.order?.tutor?.name || '-'),
          escapeCsv(item.order?.paymentMethod || 'Outro'),
          escapeCsv(formatCurrency(item.quantity * item.priceAtTime)),
        ];
        csvContent += row.join(';') + '\r\n';
      }
    } else if (type === 'inventory') {
      const whereClause: any = { establishmentId: user.id };
      if (category) whereClause.category = { equals: category, mode: 'insensitive' };

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          orderItems: {
            where: { order: { status: { not: OrderStatus.CANCELLED } } },
            select: { quantity: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      const headers = ['Produto', 'Categoria', 'Preço Unitário (R$)', 'Estoque Atual', 'Vendas Realizadas', 'Valor Total em Estoque (R$)', 'Situação'];
      csvContent += headers.join(';') + '\r\n';

      for (const p of products) {
        const sales = p.orderItems.reduce((acc, c) => acc + c.quantity, 0);
        let situacao = 'Normal';
        if (p.stock === 0) situacao = 'Esgotado';
        else if (p.stock <= 5) situacao = 'Estoque Baixo';

        const row = [
          escapeCsv(p.name),
          escapeCsv(p.category || '-'),
          escapeCsv(formatCurrency(p.price)),
          escapeCsv(p.stock),
          escapeCsv(sales),
          escapeCsv(formatCurrency(p.stock * p.price)),
          escapeCsv(situacao),
        ];
        csvContent += row.join(';') + '\r\n';
      }
    } else if (type === 'customers') {
      const appointments = await prisma.appointment.findMany({
        where: { establishmentId: user.id, date: { gte: start, lte: end } },
        include: { tutor: true, pet: true, service: true },
      });

      const tutorMap = new Map<string, { name: string; email: string; phone: string; visits: number; pets: Set<string>; lastDate: Date | null }>();
      for (const apt of appointments) {
        if (!apt.tutor) continue;
        if (!tutorMap.has(apt.tutor.id)) {
          tutorMap.set(apt.tutor.id, {
            name: apt.tutor.name,
            email: apt.tutor.email,
            phone: apt.tutor.phone || '-',
            visits: 0,
            pets: new Set(),
            lastDate: null,
          });
        }
        const t = tutorMap.get(apt.tutor.id)!;
        t.visits++;
        if (apt.pet?.name) t.pets.add(apt.pet.name);
        if (!t.lastDate || new Date(apt.date) > new Date(t.lastDate)) t.lastDate = new Date(apt.date);
      }

      const headers = ['Cliente / Tutor', 'E-mail', 'Telefone', 'Pets Atendidos', 'Total de Visitas', 'Última Visita'];
      csvContent += headers.join(';') + '\r\n';

      for (const t of tutorMap.values()) {
        const row = [
          escapeCsv(t.name),
          escapeCsv(t.email),
          escapeCsv(t.phone),
          escapeCsv(Array.from(t.pets).join(', ') || '-'),
          escapeCsv(t.visits),
          escapeCsv(formatDateTimeBr(t.lastDate)),
        ];
        csvContent += row.join(';') + '\r\n';
      }
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="relatorio-estabelecimento-${type}-${filenameDate}.csv"`);
    return reply.send(csvContent);
  },

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

    // STRICT ISOLATION: ONLY completed appointments attended by this professional
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { professionalId: user.id },
          { service: { professionalId: user.id } },
        ],
        status: AppointmentStatus.COMPLETED,
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
    for (const apt of completedAppointments) {
      grossRevenue += apt.service?.price || 0;
    }

    const count = completedAppointments.length;
    const averageTicket = count > 0 ? grossRevenue / count : 0;

    const commissionNotice =
      'No modelo de dados atual do PetHub, a porcentagem de comissão e repasse contratual não está configurada no cadastro do profissional. O valor informado representa o faturamento bruto dos serviços concluídos diretamente por você.';

    return reply.send({
      period: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      },
      summary: {
        grossRevenue,
        completedServicesCount: count,
        averageTicket,
        commissionNotice,
      },
      transactions: completedAppointments.map((apt) => ({
        id: apt.id,
        date: apt.date,
        formattedDate: formatDateTimeBr(apt.date),
        serviceName: apt.service?.name || 'Serviço',
        clientName: apt.tutor?.name || 'Cliente',
        petName: apt.pet?.name || 'Pet',
        amount: apt.service?.price || 0,
      })),
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
  // 9. PROFISSIONAL — EXPORTAÇÃO CSV
  // =========================================================================
  async exportProfessionalCsv(request: FastifyRequest<{
    Querystring: {
      type: 'services' | 'financial' | 'customers';
      startDate?: string;
      endDate?: string;
      serviceType?: string;
      status?: string;
      species?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { type, startDate, endDate, serviceType, status, species } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);

    let csvContent = '\uFEFF'; // UTF-8 BOM
    const filenameDate = new Date().toISOString().slice(0, 10);

    if (type === 'services') {
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
        whereClause.service = { category: { equals: serviceType, mode: 'insensitive' } };
      }

      const list = await prisma.appointment.findMany({
        where: whereClause,
        include: { service: true, pet: true, tutor: true, establishment: true },
        orderBy: { date: 'desc' },
      });

      const headers = ['ID', 'Data e Hora', 'Status', 'Serviço', 'Categoria', 'Valor (R$)', 'Cliente / Tutor', 'Pet', 'Espécie'];
      csvContent += headers.join(';') + '\r\n';

      for (const apt of list) {
        const row = [
          escapeCsv(apt.id),
          escapeCsv(formatDateTimeBr(apt.date)),
          escapeCsv(apt.status),
          escapeCsv(apt.service?.name || '-'),
          escapeCsv(apt.service?.category || '-'),
          escapeCsv(formatCurrency(apt.service?.price || 0)),
          escapeCsv(apt.tutor?.name || '-'),
          escapeCsv(apt.pet?.name || '-'),
          escapeCsv(apt.pet?.species || '-'),
        ];
        csvContent += row.join(';') + '\r\n';
      }
    } else if (type === 'financial') {
      const appointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { professionalId: user.id },
            { service: { professionalId: user.id } },
          ],
          status: AppointmentStatus.COMPLETED,
          date: { gte: start, lte: end },
        },
        include: { service: true, tutor: true, pet: true },
        orderBy: { date: 'desc' },
      });

      const headers = ['ID Agendamento', 'Data Conclusão', 'Serviço Atendido', 'Cliente', 'Pet', 'Valor Bruto do Serviço (R$)'];
      csvContent += headers.join(';') + '\r\n';

      for (const apt of appointments) {
        const row = [
          escapeCsv(apt.id),
          escapeCsv(formatDateTimeBr(apt.date)),
          escapeCsv(apt.service?.name || 'Serviço'),
          escapeCsv(apt.tutor?.name || '-'),
          escapeCsv(apt.pet?.name || '-'),
          escapeCsv(formatCurrency(apt.service?.price || 0)),
        ];
        csvContent += row.join(';') + '\r\n';
      }
    } else if (type === 'customers') {
      const appointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { professionalId: user.id },
            { service: { professionalId: user.id } },
          ],
          date: { gte: start, lte: end },
        },
        include: { tutor: true, pet: true },
      });

      const tutorMap = new Map<string, { name: string; email: string; phone: string; visits: number; pets: Set<string>; lastDate: Date | null }>();
      for (const apt of appointments) {
        if (!apt.tutor) continue;
        if (!tutorMap.has(apt.tutor.id)) {
          tutorMap.set(apt.tutor.id, {
            name: apt.tutor.name,
            email: apt.tutor.email,
            phone: apt.tutor.phone || '-',
            visits: 0,
            pets: new Set(),
            lastDate: null,
          });
        }
        const t = tutorMap.get(apt.tutor.id)!;
        t.visits++;
        if (apt.pet?.name) t.pets.add(apt.pet.name);
        if (!t.lastDate || new Date(apt.date) > new Date(t.lastDate)) t.lastDate = new Date(apt.date);
      }

      const headers = ['Cliente / Tutor', 'E-mail', 'Telefone', 'Pets Atendidos', 'Total de Atendimentos', 'Último Atendimento'];
      csvContent += headers.join(';') + '\r\n';

      for (const t of tutorMap.values()) {
        const row = [
          escapeCsv(t.name),
          escapeCsv(t.email),
          escapeCsv(t.phone),
          escapeCsv(Array.from(t.pets).join(', ') || '-'),
          escapeCsv(t.visits),
          escapeCsv(formatDateTimeBr(t.lastDate)),
        ];
        csvContent += row.join(';') + '\r\n';
      }
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="relatorio-profissional-${type}-${filenameDate}.csv"`);
    return reply.send(csvContent);
  },
};
