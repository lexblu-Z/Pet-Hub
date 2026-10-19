import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, AppointmentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { reportsPdfService } from '../services/reportsPdf.service';

export const APPROVED_ORDER_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

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

  if (startDate) {
    start = new Date(`${startDate}T00:00:00-03:00`);
    if (isNaN(start.getTime())) start = new Date(`${startDate}T00:00:00`);
  } else {
    start = new Date(`${firstDayStr}T00:00:00-03:00`);
  }

  if (endDate) {
    end = new Date(`${endDate}T23:59:59.999-03:00`);
    if (isNaN(end.getTime())) end = new Date(`${endDate}T23:59:59.999`);
  } else {
    end = new Date(`${lastDayStr}T23:59:59.999-03:00`);
  }

  return { start, end };
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
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
export const reportsExportController = {
  async exportEstablishment(request: FastifyRequest<{
    Querystring: {
      type: 'services' | 'financial' | 'customers' | 'inventory';
      format?: 'pdf' | 'csv';
      startDate?: string;
      endDate?: string;
      serviceType?: string;
      status?: string;
      paymentMethod?: string;
      category?: string;
      species?: string;
      professionalId?: string;
      employeeId?: string;
      operationType?: 'ALL' | 'SERVICES' | 'PRODUCTS';
    };
  }>, reply: FastifyReply) {
    const user = await ensureEstablishment(request, reply);
    if (!user) return;

    const {
      type,
      format = 'csv',
      startDate,
      endDate,
      serviceType,
      status,
      paymentMethod,
      category,
      species,
      professionalId,
      employeeId,
      operationType = 'ALL',
    } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const startDateStr = formatDateBr(start);
    const endDateStr = formatDateBr(end);
    const entityName = user.establishmentProfile?.businessName || user.name || 'Estabelecimento';
    const documentNumber = user.establishmentProfile?.document || user.phone || null;

    if (format === 'pdf') {
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
        if (professionalId) {
          whereClause.OR = [
            { professionalId },
            { employeeId: professionalId },
          ];
        } else if (employeeId) {
          whereClause.employeeId = employeeId;
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

        const completedCount = list.filter(a => a.status === AppointmentStatus.COMPLETED).length;
        const cancelledCount = list.filter(a => a.status === AppointmentStatus.CANCELLED).length;
        const totalBilled = list.filter(a => a.status === AppointmentStatus.COMPLETED).reduce((s, a) => s + (a.service?.price || 0), 0);

        const summaryCards = [
          { label: 'Total Agendamentos', value: `${list.length}` },
          { label: 'Concluídos', value: `${completedCount}` },
          { label: 'Cancelados', value: `${cancelledCount}` },
          { label: 'Faturado (Concluídos)', value: formatCurrency(totalBilled) },
        ];

        const tableHeaders = [
          { label: 'Data e Hora', width: 68 },
          { label: 'Status', width: 52 },
          { label: 'Serviço', width: 90 },
          { label: 'Categoria', width: 65 },
          { label: 'Tutor / Pet', width: 95 },
          { label: 'Responsável', width: 75 },
          { label: 'Valor (R$)', width: 60, align: 'right' as const },
        ];

        const tableRows = list.map(apt => [
          { text: formatDateTimeBr(apt.date) },
          { text: formatStatusBr(apt.status), color: getStatusColor(apt.status), bold: true },
          { text: apt.service?.name || '-' },
          { text: apt.service?.category || '-' },
          { text: `${apt.tutor?.name || 'Cliente'}${apt.pet?.name ? ` (${apt.pet.name})` : ''}` },
          { text: apt.professional?.name || apt.employee?.name || 'Não atribuído' },
          { text: formatCurrency(apt.service?.price || 0), align: 'right' as const, bold: true },
        ]);

        return reportsPdfService.generateReportPdf({
          reportType: 'services',
          scope: 'ESTABELECIMENTO',
          entityName,
          documentNumber,
          startDateStr,
          endDateStr,
          summaryCards,
          tableHeaders,
          tableRows,
        }, reply);
      } else if (type === 'financial') {
        const includeServices = operationType === 'ALL' || operationType === 'SERVICES';
        const includeProducts = operationType === 'ALL' || operationType === 'PRODUCTS';

        const appointmentWhere: any = {
          establishmentId: user.id,
          status: AppointmentStatus.COMPLETED,
          paymentStatus: 'PAID',
          date: { gte: start, lte: end },
        };
        if (paymentMethod) {
          appointmentWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
        }

        const appointments = includeServices
          ? await prisma.appointment.findMany({
              where: appointmentWhere,
              include: { service: true, tutor: true },
              orderBy: { date: 'desc' },
            })
          : [];

        const refundedAppointmentWhere: any = {
          establishmentId: user.id,
          paymentStatus: 'REFUNDED',
          date: { gte: start, lte: end },
        };
        if (paymentMethod) {
          refundedAppointmentWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
        }
        const refundedAppointments = includeServices
          ? await prisma.appointment.findMany({
              where: refundedAppointmentWhere,
              include: { service: true, tutor: true },
              orderBy: { date: 'desc' },
            })
          : [];

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
              include: { product: true, order: { include: { tutor: true } } },
              orderBy: { createdAt: 'desc' },
            })
          : [];

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
              include: { product: true, order: { include: { tutor: true } } },
              orderBy: { createdAt: 'desc' },
            })
          : [];

        const servRev = appointments.reduce((s, a) => s + (a.finalAmount ?? a.service?.price ?? 0), 0);
        const prodRev = orderItems.reduce((s, i) => s + (i.priceAtTime * i.quantity), 0);
        const refundedProdRev = cancelledOrderItems.reduce((s, i) => s + (i.priceAtTime * i.quantity), 0);
        const refundedServRev = refundedAppointments.reduce((s, a) => s + (a.finalAmount ?? a.service?.price ?? 0), 0);
        const refundedRev = refundedProdRev + refundedServRev;
        const grossTotalRev = servRev + prodRev + refundedRev;
        const netTotalRev = grossTotalRev - refundedRev;

        const summaryCards = [
          { label: 'Faturamento Bruto', value: formatCurrency(grossTotalRev) },
          { label: 'Estornos / Reembolsos', value: `- ${formatCurrency(refundedRev)}` },
          { label: 'Faturamento Líquido', value: formatCurrency(netTotalRev) },
          { label: 'Transações Válidas', value: `${appointments.length + orderItems.length}` },
        ];

        const tableHeaders = [
          { label: 'Tipo', width: 55 },
          { label: 'Data e Hora', width: 65 },
          { label: 'Descrição / Item', width: 150 },
          { label: 'Cliente / Tutor', width: 105 },
          { label: 'Método', width: 60 },
          { label: 'Valor', width: 70, align: 'right' as const },
        ];

        type TxItem = { type: 'SERVIÇO' | 'PRODUTO' | 'ESTORNO'; date: Date; desc: string; client: string; method: string; amount: number };
        const allTx: TxItem[] = [
          ...appointments.map(a => ({
            type: 'SERVIÇO' as const,
            date: new Date(a.date),
            desc: a.service?.name || 'Serviço',
            client: a.tutor?.name || '-',
            method: a.paymentMethod || 'Presencial',
            amount: a.finalAmount ?? a.service?.price ?? 0,
          })),
          ...refundedAppointments.map(a => ({
            type: 'ESTORNO' as const,
            date: new Date(a.date),
            desc: `Estorno: ${a.service?.name || 'Serviço Cancelado'}`,
            client: a.tutor?.name || '-',
            method: a.paymentMethod || 'Estorno',
            amount: -(a.finalAmount ?? a.service?.price ?? 0),
          })),
          ...orderItems.map(i => ({
            type: 'PRODUTO' as const,
            date: new Date(i.createdAt),
            desc: `${i.product?.name || 'Produto'} (${i.quantity}x)`,
            client: i.order?.tutor?.name || '-',
            method: i.order?.paymentMethod || 'Online',
            amount: i.priceAtTime * i.quantity,
          })),
          ...cancelledOrderItems.map(i => ({
            type: 'ESTORNO' as const,
            date: new Date(i.order?.refundedAt || i.createdAt),
            desc: `Cancelamento: ${i.product?.name || 'Produto'} (${i.quantity}x)`,
            client: i.order?.tutor?.name || '-',
            method: i.order?.paymentMethod ? `${i.order.paymentMethod} (Simulado)` : 'Estorno',
            amount: -(i.priceAtTime * i.quantity),
          })),
        ];
        allTx.sort((a, b) => b.date.getTime() - a.date.getTime());

        const tableRows = allTx.map(t => [
          { text: t.type, color: t.type === 'SERVIÇO' ? '#f97316' : t.type === 'ESTORNO' ? '#e11d48' : '#16a34a', bold: true },
          { text: formatDateTimeBr(t.date) },
          { text: t.desc },
          { text: t.client },
          { text: t.method },
          { text: t.amount < 0 ? `- ${formatCurrency(Math.abs(t.amount))}` : formatCurrency(t.amount), align: 'right' as const, bold: true, color: t.amount < 0 ? '#e11d48' : undefined },
        ]);

        return reportsPdfService.generateReportPdf({
          reportType: 'financial',
          scope: 'ESTABELECIMENTO',
          entityName,
          documentNumber,
          startDateStr,
          endDateStr,
          summaryCards,
          tableHeaders,
          tableRows,
        }, reply);
      } else if (type === 'inventory') {
        const whereClause: any = { establishmentId: user.id };
        if (category) whereClause.category = { equals: category, mode: 'insensitive' };

        const products = await prisma.product.findMany({
          where: whereClause,
          include: {
            orderItems: {
              where: { order: { status: { in: APPROVED_ORDER_STATUSES } } },
              select: { quantity: true },
            },
          },
          orderBy: { name: 'asc' },
        });

        const totalStock = products.reduce((s, p) => s + p.stock, 0);
        const totalStockVal = products.reduce((s, p) => s + p.stock * p.price, 0);
        const totalSold = products.reduce((s, p) => s + p.orderItems.reduce((acc, c) => acc + c.quantity, 0), 0);

        const summaryCards = [
          { label: 'Total Produtos', value: `${products.length}` },
          { label: 'Itens em Estoque', value: `${totalStock}` },
          { label: 'Valor Total Estoque', value: formatCurrency(totalStockVal) },
          { label: 'Vendas Realizadas', value: `${totalSold}` },
        ];

        const tableHeaders = [
          { label: 'Produto', width: 140 },
          { label: 'Categoria', width: 70 },
          { label: 'Preço', width: 50, align: 'right' as const },
          { label: 'Estoque', width: 50, align: 'center' as const },
          { label: 'Vendas', width: 45, align: 'center' as const },
          { label: 'Total (R$)', width: 75, align: 'right' as const },
          { label: 'Situação', width: 75, align: 'center' as const },
        ];

        const tableRows = products.map(p => {
          const sales = p.orderItems.reduce((acc, c) => acc + c.quantity, 0);
          let situacao = 'Normal';
          let sitColor = '#16a34a';
          if (p.stock === 0) {
            situacao = 'Esgotado';
            sitColor = '#e11d48';
          } else if (p.stock <= 5) {
            situacao = 'Estoque Baixo';
            sitColor = '#d97706';
          }

          return [
            { text: p.name, bold: true },
            { text: p.category || '-' },
            { text: formatCurrency(p.price), align: 'right' as const },
            { text: `${p.stock}`, align: 'center' as const, bold: true },
            { text: `${sales}`, align: 'center' as const },
            { text: formatCurrency(p.stock * p.price), align: 'right' as const, bold: true },
            { text: situacao, color: sitColor, bold: true, align: 'center' as const },
          ];
        });

        return reportsPdfService.generateReportPdf({
          reportType: 'inventory',
          scope: 'ESTABELECIMENTO',
          entityName,
          documentNumber,
          startDateStr,
          endDateStr,
          summaryCards,
          tableHeaders,
          tableRows,
        }, reply);
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

        const allPetsSet = new Set<string>();
        for (const t of tutorMap.values()) {
          t.pets.forEach(p => allPetsSet.add(p));
        }

        const summaryCards = [
          { label: 'Clientes Atendidos', value: `${tutorMap.size}` },
          { label: 'Pets Atendidos', value: `${allPetsSet.size}` },
          { label: 'Total Atendimentos', value: `${appointments.length}` },
        ];

        const tableHeaders = [
          { label: 'Cliente / Tutor', width: 110 },
          { label: 'E-mail', width: 115 },
          { label: 'Telefone', width: 75 },
          { label: 'Pets Atendidos', width: 85 },
          { label: 'Visitas', width: 45, align: 'center' as const },
          { label: 'Última Visita', width: 75, align: 'center' as const },
        ];

        const tableRows = Array.from(tutorMap.values()).map(t => [
          { text: t.name, bold: true },
          { text: t.email },
          { text: t.phone },
          { text: Array.from(t.pets).join(', ') || '-' },
          { text: `${t.visits}`, align: 'center' as const, bold: true },
          { text: formatDateTimeBr(t.lastDate), align: 'center' as const },
        ]);

        return reportsPdfService.generateReportPdf({
          reportType: 'customers',
          scope: 'ESTABELECIMENTO',
          entityName,
          documentNumber,
          startDateStr,
          endDateStr,
          summaryCards,
          tableHeaders,
          tableRows,
        }, reply);
      }
    }

    // Otherwise CSV:
    let csvContent = '\uFEFF';
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
      if (professionalId) {
        whereClause.OR = [
          { professionalId },
          { employeeId: professionalId },
        ];
      } else if (employeeId) {
        whereClause.employeeId = employeeId;
      }

      const list = await prisma.appointment.findMany({
        where: whereClause,
        include: { service: true, pet: true, tutor: true, professional: true, employee: true },
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
      const includeServices = operationType === 'ALL' || operationType === 'SERVICES';
      const includeProducts = operationType === 'ALL' || operationType === 'PRODUCTS';

      const appointmentWhere: any = {
        establishmentId: user.id,
        status: AppointmentStatus.COMPLETED,
        paymentStatus: 'PAID',
        date: { gte: start, lte: end },
      };
      if (paymentMethod) {
        appointmentWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
      }

      const appointments = includeServices
        ? await prisma.appointment.findMany({
            where: appointmentWhere,
            include: { service: true, tutor: true },
            orderBy: { date: 'desc' },
          })
        : [];

      const refundedAppointmentWhere: any = {
        establishmentId: user.id,
        paymentStatus: 'REFUNDED',
        date: { gte: start, lte: end },
      };
      if (paymentMethod) {
        refundedAppointmentWhere.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
      }
      const refundedAppointments = includeServices
        ? await prisma.appointment.findMany({
            where: refundedAppointmentWhere,
            include: { service: true, tutor: true },
            orderBy: { date: 'desc' },
          })
        : [];

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
            include: { product: true, order: { include: { tutor: true } } },
            orderBy: { createdAt: 'desc' },
          })
        : [];

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
            include: { product: true, order: { include: { tutor: true } } },
            orderBy: { createdAt: 'desc' },
          })
        : [];

      const headers = ['Tipo', 'Data', 'Descrição / Item', 'Cliente', 'Forma de Pagamento', 'Valor Bruto (R$)'];
      csvContent += headers.join(';') + '\r\n';

      for (const apt of appointments) {
        const row = [
          escapeCsv('SERVIÇO'),
          escapeCsv(formatDateTimeBr(apt.date)),
          escapeCsv(apt.service?.name || 'Serviço'),
          escapeCsv(apt.tutor?.name || '-'),
          escapeCsv(apt.paymentMethod || 'Presencial'),
          escapeCsv(formatCurrency(apt.finalAmount ?? apt.service?.price ?? 0)),
        ];
        csvContent += row.join(';') + '\r\n';
      }

      for (const apt of refundedAppointments) {
        const row = [
          escapeCsv('ESTORNO'),
          escapeCsv(formatDateTimeBr(apt.date)),
          escapeCsv(`Estorno: ${apt.service?.name || 'Serviço Cancelado'}`),
          escapeCsv(apt.tutor?.name || '-'),
          escapeCsv(apt.paymentMethod || 'Estorno'),
          escapeCsv(`-${formatCurrency(apt.finalAmount ?? apt.service?.price ?? 0)}`),
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

      for (const item of cancelledOrderItems) {
        const row = [
          escapeCsv('ESTORNO'),
          escapeCsv(formatDateTimeBr(item.order?.refundedAt || item.createdAt)),
          escapeCsv(`Cancelamento: ${item.product?.name} (${item.quantity}x)`),
          escapeCsv(item.order?.tutor?.name || '-'),
          escapeCsv(item.order?.paymentMethod ? `${item.order.paymentMethod} (Simulado)` : 'Estorno'),
          escapeCsv(`-${formatCurrency(item.quantity * item.priceAtTime)}`),
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
            where: { order: { status: { in: APPROVED_ORDER_STATUSES } } },
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
  async exportProfessional(request: FastifyRequest<{
    Querystring: {
      type: 'services' | 'financial' | 'customers';
      format?: 'pdf' | 'csv';
      startDate?: string;
      endDate?: string;
      serviceType?: string;
      status?: string;
      species?: string;
    };
  }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { type, format = 'csv', startDate, endDate, serviceType, status, species } = request.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const startDateStr = formatDateBr(start);
    const endDateStr = formatDateBr(end);
    const entityName = user.name || 'Profissional';
    const documentNumber = user.professionalProfile?.document || user.phone || null;

    if (format === 'pdf') {
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

        const completedCount = list.filter(a => a.status === AppointmentStatus.COMPLETED).length;
        const totalBilled = list.filter(a => a.status === AppointmentStatus.COMPLETED).reduce((s, a) => s + (a.service?.price || 0), 0);

        const summaryCards = [
          { label: 'Total Atendimentos', value: `${list.length}` },
          { label: 'Concluídos', value: `${completedCount}` },
          { label: 'Faturado (Concluídos)', value: formatCurrency(totalBilled) },
        ];

        const tableHeaders = [
          { label: 'Data e Hora', width: 68 },
          { label: 'Status', width: 52 },
          { label: 'Serviço', width: 95 },
          { label: 'Categoria', width: 65 },
          { label: 'Tutor / Pet', width: 105 },
          { label: 'Espécie', width: 50 },
          { label: 'Valor (R$)', width: 70, align: 'right' as const },
        ];

        const tableRows = list.map(apt => [
          { text: formatDateTimeBr(apt.date) },
          { text: formatStatusBr(apt.status), color: getStatusColor(apt.status), bold: true },
          { text: apt.service?.name || '-' },
          { text: apt.service?.category || '-' },
          { text: `${apt.tutor?.name || 'Cliente'}${apt.pet?.name ? ` (${apt.pet.name})` : ''}` },
          { text: apt.pet?.species || '-' },
          { text: formatCurrency(apt.service?.price || 0), align: 'right' as const, bold: true },
        ]);

        return reportsPdfService.generateReportPdf({
          reportType: 'services',
          scope: 'PROFISSIONAL',
          entityName,
          documentNumber,
          startDateStr,
          endDateStr,
          summaryCards,
          tableHeaders,
          tableRows,
        }, reply);
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

        const totalRevenue = appointments.reduce((sum, a) => sum + (a.service?.price || 0), 0);

        const summaryCards = [
          { label: 'Faturamento de Serviços', value: formatCurrency(totalRevenue) },
          { label: 'Atendimentos Concluídos', value: `${appointments.length}` },
          { label: 'Ticket Médio', value: formatCurrency(appointments.length ? totalRevenue / appointments.length : 0) },
        ];

        const tableHeaders = [
          { label: 'ID / Ref.', width: 60 },
          { label: 'Data Conclusão', width: 65 },
          { label: 'Serviço Atendido', width: 150 },
          { label: 'Cliente / Tutor', width: 100 },
          { label: 'Pet', width: 55 },
          { label: 'Valor Bruto', width: 75, align: 'right' as const },
        ];

        const tableRows = appointments.map(apt => [
          { text: apt.id.slice(0, 8) + '...' },
          { text: formatDateTimeBr(apt.date) },
          { text: apt.service?.name || 'Serviço' },
          { text: apt.tutor?.name || '-' },
          { text: apt.pet?.name || '-' },
          { text: formatCurrency(apt.service?.price || 0), align: 'right' as const, bold: true },
        ]);

        return reportsPdfService.generateReportPdf({
          reportType: 'financial',
          scope: 'PROFISSIONAL',
          entityName,
          documentNumber,
          startDateStr,
          endDateStr,
          summaryCards,
          tableHeaders,
          tableRows,
        }, reply);
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

        const summaryCards = [
          { label: 'Clientes Atendidos', value: `${tutorMap.size}` },
          { label: 'Total Atendimentos', value: `${appointments.length}` },
        ];

        const tableHeaders = [
          { label: 'Cliente / Tutor', width: 110 },
          { label: 'E-mail', width: 120 },
          { label: 'Telefone', width: 75 },
          { label: 'Pets Atendidos', width: 90 },
          { label: 'Visitas', width: 45, align: 'center' as const },
          { label: 'Última Visita', width: 65, align: 'center' as const },
        ];

        const tableRows = Array.from(tutorMap.values()).map(t => [
          { text: t.name, bold: true },
          { text: t.email },
          { text: t.phone },
          { text: Array.from(t.pets).join(', ') || '-' },
          { text: `${t.visits}`, align: 'center' as const, bold: true },
          { text: formatDateTimeBr(t.lastDate), align: 'center' as const },
        ]);

        return reportsPdfService.generateReportPdf({
          reportType: 'customers',
          scope: 'PROFISSIONAL',
          entityName,
          documentNumber,
          startDateStr,
          endDateStr,
          summaryCards,
          tableHeaders,
          tableRows,
        }, reply);
      }
    }

    // Otherwise CSV:
    let csvContent = '\uFEFF';
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
