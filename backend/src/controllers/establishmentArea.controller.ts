import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role, AppointmentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';

// Helper to check establishment access
async function ensureEstablishment(request: FastifyRequest, reply: FastifyReply) {
  const token = request.user as any;
  if (!token || !token.sub) {
    reply.status(401).send({ error: 'Não autenticado.' });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    include: { establishmentProfile: true },
  });
  if (!user || user.role !== Role.ESTABLISHMENT) {
    reply.status(403).send({ error: 'Acesso restrito a contas de estabelecimento.' });
    return null;
  }
  return user;
}

export const establishmentAreaController = {
  // =========================================================================
  // 1. DASHBOARD
  // =========================================================================
  async getDashboard(request: FastifyRequest<{ Querystring: { period?: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { period = 'month' } = request.query;

    const now = new Date();
    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month' || period === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // 1. Completed appointments for revenue
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        establishmentId: user.id,
        status: AppointmentStatus.COMPLETED,
        date: { gte: startDate },
      },
      include: { service: true },
    });

    const appointmentRevenue = completedAppointments.reduce((sum, a) => sum + (a.service?.price || 0), 0);

    // 2. Orders revenue from items of this establishment
    const orderItems = await prisma.orderItem.findMany({
      where: {
        establishmentId: user.id,
        order: {
          status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
          createdAt: { gte: startDate },
        },
      },
    });

    const productRevenue = orderItems.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
    const totalRevenue = appointmentRevenue + productRevenue;

    // 3. Appointments count breakdown
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const appointmentsToday = await prisma.appointment.count({
      where: {
        establishmentId: user.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    const upcomingAppointments = await prisma.appointment.count({
      where: {
        establishmentId: user.id,
        date: { gte: now },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
    });

    const completedAppointmentsCount = await prisma.appointment.count({
      where: {
        establishmentId: user.id,
        status: AppointmentStatus.COMPLETED,
      },
    });

    const cancelledAppointmentsCount = await prisma.appointment.count({
      where: {
        establishmentId: user.id,
        status: AppointmentStatus.CANCELLED,
      },
    });

    // 4. Orders count breakdown
    const pendingOrdersCount = await prisma.orderItem.count({
      where: {
        establishmentId: user.id,
        order: { status: OrderStatus.PENDING },
      },
    });

    const completedOrdersCount = await prisma.orderItem.count({
      where: {
        establishmentId: user.id,
        order: { status: OrderStatus.DELIVERED },
      },
    });

    // 5. Unique clients
    const appointmentClients = await prisma.appointment.findMany({
      where: { establishmentId: user.id },
      select: { tutorId: true },
      distinct: ['tutorId'],
    });
    const orderClients = await prisma.orderItem.findMany({
      where: { establishmentId: user.id },
      select: { order: { select: { tutorId: true } } },
      distinct: ['orderId'],
    });

    const uniqueClientIds = new Set<string>();
    appointmentClients.forEach(a => uniqueClientIds.add(a.tutorId));
    orderClients.forEach(o => {
      if (o.order?.tutorId) uniqueClientIds.add(o.order.tutorId);
    });

    // 6. Pets attended count
    const uniquePets = await prisma.appointment.findMany({
      where: {
        establishmentId: user.id,
        status: AppointmentStatus.COMPLETED,
      },
      select: { petId: true },
      distinct: ['petId'],
    });

    // 7. Top sold products
    const productSalesMap: Record<string, { name: string; photo: string | null; quantity: number; revenue: number }> = {};
    const allSoldItems = await prisma.orderItem.findMany({
      where: { establishmentId: user.id },
      include: { product: true },
    });

    for (const item of allSoldItems) {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.product?.name || 'Produto',
          photo: item.product?.photo || null,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.priceAtTime * item.quantity;
    }

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 8. Revenue chart data points (grouped by day/month based on period)
    const revenuePoints: { date: string; amount: number }[] = [];
    const daysCount = period === 'today' ? 1 : period === '7days' ? 7 : 30;
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', ' ').replace('.', '');
      
      const dayStart = new Date(dayStr + 'T00:00:00');
      const dayEnd = new Date(dayStr + 'T23:59:59');

      const appRev = completedAppointments
        .filter(a => a.date >= dayStart && a.date <= dayEnd)
        .reduce((sum, a) => sum + (a.service?.price || 0), 0);

      const ordRev = orderItems
        .filter(it => it.createdAt >= dayStart && it.createdAt <= dayEnd)
        .reduce((sum, it) => sum + (it.priceAtTime * it.quantity), 0);

      revenuePoints.push({ date: label, amount: appRev + ordRev });
    }

    const hasData = totalRevenue > 0 || appointmentsToday > 0 || completedAppointmentsCount > 0 || uniqueClientIds.size > 0;

    return reply.send({
      hasData,
      revenue: totalRevenue,
      appointmentRevenue,
      productRevenue,
      appointments: {
        today: appointmentsToday,
        upcoming: upcomingAppointments,
        completed: completedAppointmentsCount,
        cancelled: cancelledAppointmentsCount,
      },
      orders: {
        pending: pendingOrdersCount,
        completed: completedOrdersCount,
      },
      clientsCount: uniqueClientIds.size,
      petsCount: uniquePets.length,
      topProducts,
      revenueChart: revenuePoints,
      averageRating: 5.0,
    });
  },

  // =========================================================================
  // 2. MEU ESTABELECIMENTO (PROFILE, PHOTOS, HOURS)
  // =========================================================================
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    return reply.send({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      establishmentProfile: user.establishmentProfile,
    });
  },

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const schema = z.object({
      businessName: z.string().min(2).optional(),
      type: z.string().optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    });

    const data = schema.parse(request.body);

    if (data.city && data.city.trim().toLowerCase() !== 'ourinhos') {
      return reply.status(400).send({ error: 'Apenas estabelecimentos em Ourinhos - SP são permitidos.' });
    }
    if (data.state && data.state.trim().toUpperCase() !== 'SP') {
      return reply.status(400).send({ error: 'Apenas estabelecimentos em Ourinhos - SP são permitidos.' });
    }

    const updatedProfile = await prisma.establishmentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...data,
      },
      update: data,
    });

    return reply.send(updatedProfile);
  },

  async addPhoto(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { photoUrl } = z.object({ photoUrl: z.string().min(1) }).parse(request.body);

    const currentPhotos = user.establishmentProfile?.photos || [];
    const updatedPhotos = [...currentPhotos, photoUrl];

    const updated = await prisma.establishmentProfile.update({
      where: { userId: user.id },
      data: { photos: updatedPhotos },
    });

    return reply.send({ photos: updated.photos });
  },

  async removePhoto(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { photoUrl } = z.object({ photoUrl: z.string().min(1) }).parse(request.body);

    const currentPhotos = user.establishmentProfile?.photos || [];
    const updatedPhotos = currentPhotos.filter(p => p !== photoUrl);

    const updated = await prisma.establishmentProfile.update({
      where: { userId: user.id },
      data: { photos: updatedPhotos },
    });

    return reply.send({ photos: updated.photos });
  },

  async getWorkingHours(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const defaultHours = {
      monday: { isOpen: true, open: '08:00', close: '18:00' },
      tuesday: { isOpen: true, open: '08:00', close: '18:00' },
      wednesday: { isOpen: true, open: '08:00', close: '18:00' },
      thursday: { isOpen: true, open: '08:00', close: '18:00' },
      friday: { isOpen: true, open: '08:00', close: '18:00' },
      saturday: { isOpen: true, open: '08:00', close: '14:00' },
      sunday: { isOpen: false, open: '09:00', close: '12:00' },
    };

    return reply.send(user.establishmentProfile?.workingHours || defaultHours);
  },

  async updateWorkingHours(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const hours = request.body as any;

    const updated = await prisma.establishmentProfile.update({
      where: { userId: user.id },
      data: { workingHours: hours },
    });

    return reply.send(updated.workingHours);
  },

  // =========================================================================
  // 3. SERVICES
  // =========================================================================
  async listServices(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const services = await prisma.service.findMany({
      where: { establishmentId: user.id },
      include: {
        employees: {
          include: { employee: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(services);
  },

  async createService(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const schema = z.object({
      name: z.string().min(2, 'Nome é obrigatório'),
      description: z.string().optional(),
      price: z.number().min(0, 'Preço deve ser positivo'),
      duration: z.number().min(5, 'Duração mínima é de 5 minutos'),
      image: z.string().optional(),
      category: z.string().optional(),
      animalType: z.string().optional().default('all'),
      employeeIds: z.array(z.string()).optional(),
    });

    const data = schema.parse(request.body);

    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        image: data.image,
        category: data.category,
        animalType: data.animalType,
        establishmentId: user.id,
        employees: data.employeeIds && data.employeeIds.length > 0 ? {
          create: data.employeeIds.map(empId => ({ employeeId: empId }))
        } : undefined,
      },
      include: {
        employees: { include: { employee: true } }
      }
    });

    return reply.status(201).send(service);
  },

  async updateService(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.service.findFirst({
      where: { id, establishmentId: user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Serviço não encontrado ou você não tem permissão.' });

    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      price: z.number().min(0).optional(),
      duration: z.number().min(5).optional(),
      image: z.string().optional(),
      category: z.string().optional(),
      animalType: z.string().optional(),
      employeeIds: z.array(z.string()).optional(),
    });

    const data = schema.parse(request.body);

    if (data.employeeIds !== undefined) {
      await prisma.employeeService.deleteMany({ where: { serviceId: id } });
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        image: data.image,
        category: data.category,
        animalType: data.animalType,
        employees: data.employeeIds && data.employeeIds.length > 0 ? {
          create: data.employeeIds.map(empId => ({ employeeId: empId }))
        } : undefined,
      },
      include: {
        employees: { include: { employee: true } }
      }
    });

    return reply.send(service);
  },

  async deleteService(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.service.findFirst({
      where: { id, establishmentId: user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Serviço não encontrado ou acesso negado.' });

    await prisma.employeeService.deleteMany({ where: { serviceId: id } });
    await prisma.appointment.deleteMany({ where: { serviceId: id } });
    await prisma.service.delete({ where: { id } });

    return reply.send({ message: 'Serviço removido com sucesso.' });
  },

  // =========================================================================
  // 4. PRODUCTS
  // =========================================================================
  async listProducts(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const products = await prisma.product.findMany({
      where: { establishmentId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(products);
  },

  async createProduct(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const schema = z.object({
      name: z.string().min(2, 'Nome é obrigatório'),
      description: z.string().optional(),
      category: z.string().optional(),
      price: z.number().positive('Preço deve ser maior que zero'),
      stock: z.number().int().nonnegative().default(0),
      photo: z.string().optional(),
    });

    const data = schema.parse(request.body);

    const product = await prisma.product.create({
      data: {
        ...data,
        establishmentId: user.id,
      },
    });

    return reply.status(201).send(product);
  },

  async updateProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.product.findFirst({
      where: { id, establishmentId: user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Produto não encontrado ou acesso negado.' });

    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      price: z.number().positive().optional(),
      stock: z.number().int().nonnegative().optional(),
      photo: z.string().optional(),
    });

    const data = schema.parse(request.body);

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    return reply.send(updated);
  },

  async deleteProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.product.findFirst({
      where: { id, establishmentId: user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Produto não encontrado ou acesso negado.' });

    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return reply.send({ message: 'Produto removido com sucesso.' });
  },

  // =========================================================================
  // 5. EMPLOYEES
  // =========================================================================
  async listEmployees(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const employees = await prisma.employee.findMany({
      where: { establishmentId: user.id },
      include: {
        services: {
          include: { service: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(employees);
  },

  async createEmployee(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const schema = z.object({
      name: z.string().min(2, 'Nome é obrigatório'),
      role: z.string().min(2, 'Função é obrigatória'),
      phone: z.string().optional(),
      description: z.string().optional(),
      avatar: z.string().optional(),
      active: z.boolean().default(true),
      workingDays: z.any().optional(),
      serviceIds: z.array(z.string()).optional(),
    });

    const data = schema.parse(request.body);

    const employee = await prisma.employee.create({
      data: {
        establishmentId: user.id,
        name: data.name,
        role: data.role,
        phone: data.phone,
        description: data.description,
        avatar: data.avatar,
        active: data.active,
        workingDays: data.workingDays,
        services: data.serviceIds && data.serviceIds.length > 0 ? {
          create: data.serviceIds.map(srvId => ({ serviceId: srvId }))
        } : undefined,
      },
      include: {
        services: { include: { service: true } }
      }
    });

    return reply.status(201).send(employee);
  },

  async updateEmployee(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.employee.findFirst({
      where: { id, establishmentId: user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Funcionário não encontrado ou acesso negado.' });

    const schema = z.object({
      name: z.string().min(2).optional(),
      role: z.string().min(2).optional(),
      phone: z.string().optional(),
      description: z.string().optional(),
      avatar: z.string().optional(),
      active: z.boolean().optional(),
      workingDays: z.any().optional(),
      serviceIds: z.array(z.string()).optional(),
    });

    const data = schema.parse(request.body);

    if (data.serviceIds !== undefined) {
      await prisma.employeeService.deleteMany({ where: { employeeId: id } });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone,
        description: data.description,
        avatar: data.avatar,
        active: data.active,
        workingDays: data.workingDays,
        services: data.serviceIds && data.serviceIds.length > 0 ? {
          create: data.serviceIds.map(srvId => ({ serviceId: srvId }))
        } : undefined,
      },
      include: {
        services: { include: { service: true } }
      }
    });

    return reply.send(updated);
  },

  async deleteEmployee(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.employee.findFirst({
      where: { id, establishmentId: user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Funcionário não encontrado ou acesso negado.' });

    await prisma.employeeService.deleteMany({ where: { employeeId: id } });
    await prisma.employee.delete({ where: { id } });

    return reply.send({ message: 'Funcionário removido com sucesso.' });
  },

  // =========================================================================
  // 6. ORDERS
  // =========================================================================
  async listOrders(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const orderItems = await prisma.orderItem.findMany({
      where: { establishmentId: user.id },
      include: {
        product: true,
        order: {
          include: {
            tutor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const orderMap: Record<string, any> = {};
    for (const item of orderItems) {
      const order = item.order;
      if (!order) continue;

      if (!orderMap[order.id]) {
        orderMap[order.id] = {
          id: order.id,
          orderNumber: order.id.slice(0, 8).toUpperCase(),
          status: order.status,
          paymentMethod: order.paymentMethod,
          deliveryMethod: order.deliveryMethod || 'DELIVERY',
          deliveryAddress: order.deliveryAddress,
          needsChange: order.needsChange || false,
          changeFor: order.changeFor,
          notes: order.notes,
          cancelledAt: order.cancelledAt,
          cancelledBy: order.cancelledBy,
          cancellationReason: order.cancellationReason,
          cancellationNotes: order.cancellationNotes,
          createdAt: order.createdAt,
          tutor: order.tutor,
          items: [],
          totalAmount: 0,
        };
      }
      orderMap[order.id].items.push({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Produto',
        photo: item.product?.photo || null,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
        subtotal: item.priceAtTime * item.quantity,
      });
      orderMap[order.id].totalAmount += item.priceAtTime * item.quantity;
    }

    const orders = Object.values(orderMap);
    return reply.send(orders);
  },

  async updateOrderStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;
    const { status } = z.object({ status: z.nativeEnum(OrderStatus) }).parse(request.body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) return reply.status(404).send({ error: 'Pedido não encontrado.' });

    const hasItem = order.items.some((it) => it.establishmentId === user.id);
    if (!hasItem) return reply.status(403).send({ error: 'Você não tem permissão para alterar este pedido.' });

    // 1. Immutable final states or delivered state cannot be updated via updateOrderStatus
    if (order.status === OrderStatus.COMPLETED) {
      return reply.status(400).send({
        error: 'Este pedido já foi concluído pelo tutor e seu status não pode mais ser alterado.',
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return reply.status(400).send({
        error: 'Este pedido foi cancelado e seu status não pode ser alterado.',
      });
    }

    if (order.status === OrderStatus.DELIVERED) {
      return reply.status(400).send({
        error: 'Este pedido já foi entregue e aguarda confirmação de recebimento pelo tutor. Não é possível regredir ou alterar seu status.',
      });
    }

    // 2. Disallow setting to COMPLETED (only tutor can confirm receipt)
    if (status === OrderStatus.COMPLETED) {
      return reply.status(400).send({
        error: 'A conclusão do pedido requer a confirmação de recebimento pelo cliente/tutor.',
      });
    }

    // 3. Disallow setting to CANCELLED via generic status update (must use /cancel route)
    if (status === OrderStatus.CANCELLED) {
      return reply.status(400).send({
        error: 'Para cancelar o pedido, utilize a funcionalidade de cancelamento informando o motivo.',
      });
    }

    // 4. Validate legitimate forward progression
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
      [OrderStatus.PAID]: [OrderStatus.PREPARING],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING],
      [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.READY_FOR_PICKUP],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowedNext = validTransitions[order.status] || [];
    if (!allowedNext.includes(status) && order.status !== status) {
      return reply.status(400).send({
        error: `Transição de status inválida de "${order.status}" para "${status}".`,
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { tutor: true },
    });

    try {
      const statusTranslations: Record<string, string> = {
        PENDING: 'Pendente',
        PAID: 'Confirmado',
        CONFIRMED: 'Confirmado pelo Estabelecimento',
        PREPARING: 'Em Preparo / Separando Produtos',
        SHIPPED: 'Em Transporte / A Caminho',
        READY_FOR_PICKUP: 'Pronto para Retirada no Balcão',
        DELIVERED: 'Entregue / Aguardando Confirmação do Cliente',
        COMPLETED: 'Concluído',
        CANCELLED: 'Cancelado',
      };
      const label = statusTranslations[status] || status;
      await prisma.notification.create({
        data: {
          userId: updated.tutorId,
          title: `Atualização no pedido #${id.slice(0, 8).toUpperCase()}`,
          message: `O status do seu pedido foi atualizado para "${label}".`,
          type: 'ORDER',
        },
      });
    } catch (notifErr) {
      request.log.error(notifErr, 'Erro ao criar notificação de atualização de status do pedido');
    }

    return reply.send(updated);
  },

  async cancelOrder(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;
    const cancelSchema = z.object({
      reason: z.string().min(1, 'Motivo do cancelamento é obrigatório'),
      notes: z.string().optional().nullable(),
    });

    const { reason, notes } = cancelSchema.parse(request.body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) return reply.status(404).send({ error: 'Pedido não encontrado.' });

    const hasItem = order.items.some((it) => it.establishmentId === user.id);
    if (!hasItem) return reply.status(403).send({ error: 'Você não tem permissão para cancelar este pedido.' });

    // Explicit checks for non-cancellable statuses
    if (order.status === OrderStatus.DELIVERED) {
      return reply.status(400).send({
        error: 'Este pedido já foi entregue e não pode mais ser cancelado pelo estabelecimento.',
      });
    }

    if (order.status === OrderStatus.COMPLETED) {
      return reply.status(400).send({
        error: 'Este pedido já foi concluído pelo tutor e não pode mais ser cancelado.',
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return reply.status(400).send({
        error: 'Este pedido já foi cancelado anteriormente.',
      });
    }

    // Cancellable statuses for establishment
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.SHIPPED,
      OrderStatus.READY_FOR_PICKUP,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      return reply.status(400).send({
        error: `Pedidos com status "${order.status}" não podem ser cancelados pelo estabelecimento.`,
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Atomic conditional update to prevent race conditions
        const updateResult = await tx.order.updateMany({
          where: {
            id,
            status: { in: cancellableStatuses },
          },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledBy: 'ESTABLISHMENT',
            cancellationReason: reason,
            cancellationNotes: notes || null,
          },
        });

        if (updateResult.count === 0) {
          // Status changed concurrently! Re-fetch to return exact descriptive error
          const currentOrder = await tx.order.findUnique({ where: { id } });
          if (!currentOrder) throw new Error('Pedido não encontrado.');
          if (currentOrder.status === OrderStatus.DELIVERED) {
            throw new Error('Este pedido já foi entregue e não pode mais ser cancelado pelo estabelecimento.');
          }
          if (currentOrder.status === OrderStatus.COMPLETED) {
            throw new Error('Este pedido já foi concluído pelo tutor e não pode mais ser cancelado.');
          }
          if (currentOrder.status === OrderStatus.CANCELLED) {
            throw new Error('Este pedido já foi cancelado anteriormente.');
          }
          throw new Error('O status do pedido foi alterado concorrentemente e não pode mais ser cancelado.');
        }

        // Fetch the updated order
        const updated = await tx.order.findUniqueOrThrow({
          where: { id },
          include: { items: true },
        });

        // Restore stock for each item strictly inside the transaction
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        // Create notification for tutor
        const orderShortId = id.slice(0, 8).toUpperCase();
        await tx.notification.create({
          data: {
            userId: order.tutorId,
            title: `Pedido #${orderShortId} Cancelado pelo Estabelecimento`,
            message: `Seu pedido foi cancelado pelo estabelecimento parceiro. Motivo: ${reason}${notes ? ` (${notes})` : ''}. O estoque foi reposto.`,
            type: 'ORDER',
          },
        });

        return updated;
      });

      return reply.send({ success: true, order: result });
    } catch (txErr: any) {
      return reply.status(400).send({
        error: txErr.message || 'Erro ao processar cancelamento do pedido.',
      });
    }
  },

  // =========================================================================
  // 7. APPOINTMENTS
  // =========================================================================
  async listAppointments(
    request: FastifyRequest<{ Querystring: { date?: string; startDate?: string; endDate?: string; status?: string } }>,
    reply: FastifyReply
  ) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { date, startDate, endDate, status } = request.query;

    const where: any = {
      establishmentId: user.id,
    };

    if (status && status !== 'ALL') {
      where.status = status as AppointmentStatus;
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      where.date = {
        gte: dayStart,
        lte: dayEnd,
      };
    } else if (startDate && endDate) {
      const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
      const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
      where.date = {
        gte: rangeStart,
        lte: rangeEnd,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        pet: true,
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          }
        },
        service: true,
        employee: true,
      },
      orderBy: { date: 'asc' },
    });

    const formatted = appointments.map(a => {
      const dateObj = new Date(a.date);
      const timeStr = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
      const dateStr = dateObj.toISOString().split('T')[0];
      return {
        id: a.id,
        time: timeStr,
        date: dateStr,
        dateISO: a.date.toISOString(),
        petId: a.petId,
        petName: a.pet?.name || 'Pet',
        petSpecies: a.pet?.species || 'Animal',
        petBreed: a.pet?.breed || null,
        petPhoto: a.pet?.photo || null,
        tutorId: a.tutorId,
        tutorName: a.tutor?.name || 'Tutor',
        tutorEmail: a.tutor?.email || '',
        tutorPhone: a.tutor?.phone || null,
        tutorPhoto: a.tutor?.avatar || null,
        serviceId: a.serviceId,
        service: a.service?.name || 'Serviço',
        serviceCategory: a.service?.category || null,
        price: Number(a.service?.price ?? 0),
        duration: a.service?.duration || 60,
        status: a.status,
        employeeId: a.employeeId || null,
        employee: a.employee ? {
          id: a.employee.id,
          name: a.employee.name,
          role: a.employee.role,
        } : null,
        establishmentId: a.establishmentId,
        professionalId: a.professionalId || null,
      };
    });

    return reply.send(formatted);
  },

  async updateAppointmentStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;
    const { status } = z.object({ status: z.nativeEnum(AppointmentStatus) }).parse(request.body);

    const existing = await prisma.appointment.findFirst({
      where: { id, establishmentId: user.id },
      include: {
        pet: true,
        service: true,
      }
    });
    if (!existing) return reply.status(404).send({ error: 'Agendamento não encontrado ou acesso negado.' });

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        pet: true,
        tutor: true,
        service: true,
        employee: true,
      }
    });

    // Notify tutor about status change
    try {
      const statusLabels: Record<string, string> = {
        CONFIRMED: 'confirmado',
        IN_PROGRESS: 'iniciado',
        COMPLETED: 'concluído',
        CANCELLED: 'cancelado',
        PENDING: 'agendado',
      };
      const label = statusLabels[status] || status.toLowerCase();
      await prisma.notification.create({
        data: {
          userId: existing.tutorId,
          title: `Agendamento ${label}`,
          message: `O agendamento de ${existing.pet?.name || 'seu pet'} para ${existing.service?.name || 'o serviço'} foi ${label}.`,
          type: 'APPOINTMENT',
        }
      });
    } catch (notifErr) {
      request.log.warn({ err: notifErr }, 'Could not create notification for tutor on status change');
    }

    const action = status === AppointmentStatus.CANCELLED ? 'CANCEL' : 'UPDATE';
    googleCalendarService.syncAppointment(id, action).catch(() => {});

    return reply.send(updated);
  },

  async assignEmployeeToAppointment(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const { id } = request.params;
    const { employeeId } = z.object({ employeeId: z.string().nullable() }).parse(request.body);

    const existing = await prisma.appointment.findFirst({
      where: { id, establishmentId: user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Agendamento não encontrado ou acesso negado.' });

    const updated = await prisma.appointment.update({
      where: { id },
      data: { employeeId },
      include: {
        pet: true,
        tutor: true,
        service: true,
        employee: true,
      }
    });

    return reply.send(updated);
  },
};
