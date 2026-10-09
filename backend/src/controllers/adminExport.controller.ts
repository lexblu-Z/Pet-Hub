import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { AppointmentStatus, OrderStatus, ReportStatus } from '@prisma/client';

const exportQuerySchema = z.object({
  type: z.enum(['finance', 'appointments', 'pets', 'moderation']),
  format: z.enum(['pdf', 'csv']).default('pdf'),
  period: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'Concluído',
    DELIVERED: 'Entregue',
    CONFIRMED: 'Confirmado',
    PENDING: 'Pendente',
    CANCELLED: 'Cancelado',
    IN_PROGRESS: 'Em andamento',
    RESOLVED: 'Resolvido',
    INVESTIGATING: 'Em análise',
  };
  return map[status] || status;
}

function getStatusColor(status: string): string {
  if (['COMPLETED', 'DELIVERED', 'CONFIRMED', 'RESOLVED', 'ACTIVE', 'Concluído', 'Entregue', 'Confirmado', 'Resolvido', 'Ativo'].includes(status)) {
    return '#059669'; // emerald green
  }
  if (['CANCELLED', 'REJECTED', 'Cancelado'].includes(status)) {
    return '#dc2626'; // red
  }
  if (['PENDING', 'IN_PROGRESS', 'INVESTIGATING', 'Pendente', 'Em andamento', 'Em análise'].includes(status)) {
    return '#d97706'; // amber
  }
  return '#475569';
}

function getOfficialLogoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'src/assets/logo_transparent.png'),
    path.resolve(process.cwd(), 'backend/src/assets/logo_transparent.png'),
    path.resolve(process.cwd(), '../logo_transparent.png'),
    path.resolve(process.cwd(), 'logo_transparent.png'),
    'C:/Users/leona/OneDrive/Documentos/Projetos/Pet-Hub-main/Pet-Hub-main/backend/src/assets/logo_transparent.png',
    'C:/Users/leona/OneDrive/Documentos/Projetos/Pet-Hub-main/Pet-Hub-main/logo_transparent.png',
    path.resolve(process.cwd(), 'src/assets/logo.jpg'),
    path.resolve(process.cwd(), '../logo.jpg'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export const adminExportController = {
  async exportReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = exportQuerySchema.parse(request.query);

      let start = new Date();
      let end = new Date();

      if (query.startDate) {
        start = new Date(query.startDate);
        start.setUTCHours(0, 0, 0, 0);
      } else if (query.period === 'today') {
        start.setUTCHours(0, 0, 0, 0);
      } else if (query.period === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setUTCHours(0, 0, 0, 0);
      } else if (query.period === 'month') {
        start.setDate(1);
        start.setUTCHours(0, 0, 0, 0);
      } else if (query.period === 'year') {
        start.setMonth(0, 1);
        start.setUTCHours(0, 0, 0, 0);
      } else {
        start.setDate(1);
        start.setUTCHours(0, 0, 0, 0);
      }

      if (query.endDate) {
        end = new Date(query.endDate);
        end.setUTCHours(23, 59, 59, 999);
      } else {
        end.setUTCHours(23, 59, 59, 999);
      }

      if (query.format === 'csv') {
        return adminExportController.generateCsv(query.type, start, end, reply);
      } else {
        return adminExportController.generatePdf(query.type, start, end, reply);
      }
    } catch (error: any) {
      request.log.error(error, 'Error generating export report');
      return reply.status(500).send({ error: 'Erro ao gerar relatório de exportação.' });
    }
  },

  async generatePdf(type: string, start: Date, end: Date, reply: FastifyReply) {
    // Safe margins: 45pt on A4 (595.28 x 841.89 pt). Printable width = 505pt.
    const doc = new PDFDocument({ margin: 45, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    const periodStr = `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;
    const generatedAtStr = formatDate(new Date());
    const logoPath = getOfficialLogoPath();

    const typeTitleMap: Record<string, string> = {
      finance: 'RELATÓRIO FINANCEIRO & CONTÁBIL',
      appointments: 'RELATÓRIO DE AGENDAMENTOS',
      pets: 'RELATÓRIO DO PLANTEL DE PETS',
      moderation: 'RELATÓRIO DE MODERAÇÃO',
    };
    const typeTitle = typeTitleMap[type] || `RELATÓRIO: ${type.toUpperCase()}`;

    // --- Page 1 Header Banner ---
    const PAGE_X = 45;
    const PAGE_WIDTH = 505;

    doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 68, 6).fill('#0f172a');

    // Official Logo insertion (transparent PNG)
    if (logoPath) {
      try {
        doc.image(logoPath, PAGE_X + 8, 55, { fit: [102, 36] });
      } catch {
        doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('PetHub', PAGE_X + 12, 58);
      }
    } else {
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('PetHub', PAGE_X + 12, 58);
    }

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#f97316').text('CENTRO DE CONTROLE OPERACIONAL', PAGE_X + 122, 57);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff').text(typeTitle, PAGE_X + 122, 70, { width: 225, lineBreak: false, ellipsis: true });

    doc.fontSize(8).font('Helvetica').fillColor('#cbd5e1').text(`Período: ${periodStr}`, PAGE_X + 345, 57, { align: 'right', width: 150 });
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado em: ${generatedAtStr}`, PAGE_X + 345, 71, { align: 'right', width: 150 });
    doc.fontSize(7).font('Helvetica').fillColor('#f97316').text('Documento Oficial PetHub', PAGE_X + 345, 84, { align: 'right', width: 150 });

    let y = 125;

    // Helper to draw subsequent page compact headers
    const drawSubsequentHeader = () => {
      doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 26, 4).fill('#0f172a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#f97316').text('PetHub', PAGE_X + 10, 53);
      doc.fontSize(8).font('Helvetica').fillColor('#ffffff').text(`|  ${typeTitle} (${periodStr})`, PAGE_X + 45, 53);
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado: ${generatedAtStr}`, PAGE_X + 340, 53, { align: 'right', width: 155 });
    };

    // Helper for table column header
    const drawTableHead = (currentY: number) => {
      doc.rect(PAGE_X, currentY, PAGE_WIDTH, 20).fill('#1e293b');
      doc.rect(PAGE_X, currentY, PAGE_WIDTH, 20).stroke('#0f172a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');

      if (type === 'finance') {
        // Widths: 72, 50, 168, 65, 55, 95 = 505
        const dividers = [117, 167, 335, 400, 455];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('TIPO', 50, currentY + 6);
        doc.text('DATA', 121, currentY + 6);
        doc.text('CÓDIGO / DETALHAMENTO', 172, currentY + 6);
        doc.text('MÉTODO', 340, currentY + 6);
        doc.text('STATUS', 405, currentY + 6);
        doc.text('VALOR', 458, currentY + 6, { align: 'right', width: 87 });
      } else if (type === 'appointments') {
        // Widths: 65, 72, 140, 95, 48, 85 = 505
        const dividers = [110, 182, 322, 417, 465];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('CÓDIGO', 49, currentY + 6);
        doc.text('DATA/HORA', 114, currentY + 6);
        doc.text('TUTOR / PET', 186, currentY + 6);
        doc.text('SERVIÇO', 326, currentY + 6);
        doc.text('STATUS', 421, currentY + 6);
        doc.text('VALOR', 469, currentY + 6, { align: 'right', width: 77 });
      } else if (type === 'pets') {
        // Widths: 110, 65, 125, 75, 45, 85 = 505
        const dividers = [155, 220, 345, 420, 465];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('NOME DO PET', 49, currentY + 6);
        doc.text('ESPÉCIE', 159, currentY + 6);
        doc.text('RAÇA', 224, currentY + 6);
        doc.text('PESO / IDADE', 349, currentY + 6);
        doc.text('CADASTRO', 424, currentY + 6);
        doc.text('STATUS', 469, currentY + 6);
      } else if (type === 'moderation') {
        // Widths: 65, 50, 95, 95, 105, 95 = 505
        const dividers = [110, 160, 255, 350, 455];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('PROTOCOLO', 49, currentY + 6);
        doc.text('DATA', 114, currentY + 6);
        doc.text('DENUNCIANTE', 164, currentY + 6);
        doc.text('DENUNCIADO', 259, currentY + 6);
        doc.text('MOTIVO', 354, currentY + 6);
        doc.text('STATUS', 459, currentY + 6);
      }
      return currentY + 20;
    };

    if (type === 'finance') {
      const appointments = await prisma.appointment.findMany({
        where: { date: { gte: start, lte: end }, status: AppointmentStatus.COMPLETED },
        include: { service: true, tutor: { select: { name: true } } },
        orderBy: { date: 'desc' },
      });
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end }, status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] } },
        include: { tutor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      const cashback = await prisma.cashbackTransaction.aggregate({
        where: { createdAt: { gte: start, lte: end }, type: 'REDEEMED' },
        _sum: { amount: true },
      });

      const appRevenue = appointments.reduce((s, a) => s + (a.service?.price || 0), 0);
      const orderRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const gross = appRevenue + orderRevenue;
      const platformFee = Number((gross * 0.10).toFixed(2));
      const cashbackUsed = cashback._sum.amount || 0;
      const net = Number(Math.max(0, gross - platformFee - cashbackUsed).toFixed(2));

      // Professional Summary Card
      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 76, 5).fill('#f8fafc');
      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 76, 5).stroke('#e2e8f0');

      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('CONSOLIDAÇÃO FINANCEIRA OFICIAL', PAGE_X + 12, y + 10);
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569');

      doc.text(`Faturamento Bruto:`, PAGE_X + 12, y + 28);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(gross), PAGE_X + 115, y + 28);

      doc.font('Helvetica').fillColor('#475569').text(`Taxas Plataforma (10%):`, PAGE_X + 12, y + 43);
      doc.font('Helvetica-Bold').fillColor('#ea580c').text(formatCurrency(platformFee), PAGE_X + 115, y + 43);

      doc.font('Helvetica').fillColor('#475569').text(`Cashback Resgatado:`, PAGE_X + 270, y + 28);
      doc.font('Helvetica-Bold').fillColor('#7c3aed').text(formatCurrency(cashbackUsed), PAGE_X + 380, y + 28);

      doc.font('Helvetica').fillColor('#475569').text(`Faturamento Líquido:`, PAGE_X + 270, y + 43);
      doc.font('Helvetica-Bold').fillColor('#0284c7').text(formatCurrency(net), PAGE_X + 380, y + 43);

      doc.font('Helvetica').fillColor('#64748b').text(
        `Total de Transações Concluídas: ${appointments.length + orders.length} (${appointments.length} agendamentos + ${orders.length} pedidos em loja)`,
        PAGE_X + 12,
        y + 59
      );

      y += 92;

      // Section Title
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Detalhamento de Transações Contábeis', PAGE_X, y);
      y += 16;

      // Initial Table Header
      y = drawTableHead(y);

      // Merge transactions chronologically
      type TransactionRow = {
        type: string;
        date: Date;
        code: string;
        desc: string;
        method: string;
        status: string;
        amount: number;
      };

      const rows: TransactionRow[] = [
        ...orders.map((o) => ({
          type: 'PEDIDO',
          date: o.createdAt,
          code: `#PED-${o.id.slice(0, 6).toUpperCase()}`,
          desc: `Pedido loja (${o.tutor?.name || 'Cliente'})`,
          method: o.paymentMethod || 'A combinar',
          status: o.status,
          amount: o.totalAmount,
        })),
        ...appointments.map((a) => ({
          type: 'AGENDAMENTO',
          date: a.date,
          code: `#AGD-${a.id.slice(0, 6).toUpperCase()}`,
          desc: `${a.service?.name || 'Serviço'} (${a.tutor?.name || 'Tutor'})`,
          method: 'Presencial / Local',
          status: a.status,
          amount: a.service?.price || 0,
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      if (rows.length === 0) {
        doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 30, 3).fill('#f8fafc');
        doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8').text('Nenhuma transação registrada no período selecionado.', PAGE_X, y + 10, { align: 'center', width: PAGE_WIDTH });
        y += 35;
      } else {
        const dividers = [117, 167, 335, 400, 455];
        rows.forEach((r, i) => {
          doc.fontSize(7.5).font('Helvetica');
          const hDesc = doc.heightOfString(`${r.code} - ${r.desc}`, { width: 160 });
          const rowHeight = Math.max(20, Math.ceil(hDesc + 7));

          if (y + rowHeight > 730) {
            doc.addPage();
            drawSubsequentHeader();
            y = drawTableHead(80);
          }

          const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).fill(bg);
          doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).stroke('#e2e8f0');
          dividers.forEach((x) => {
            doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke('#e2e8f0');
          });

          const textY = y + 5.5;
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(r.type, 50, textY, { width: 64, ellipsis: true });
          doc.font('Helvetica').fillColor('#1e293b').text(formatDateShort(r.date), 121, textY, { width: 44 });
          doc.text(`${r.code} - ${r.desc}`, 172, textY, { width: 160 });
          doc.text(r.method, 340, textY, { width: 57, ellipsis: true });
          doc.font('Helvetica-Bold').fillColor(getStatusColor(r.status)).text(formatStatus(r.status), 405, textY, { width: 47, ellipsis: true });
          doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(r.amount), 458, textY, { align: 'right', width: 87 });

          y += rowHeight;
        });

        // Summary Total Row
        doc.rect(PAGE_X, y, PAGE_WIDTH, 24).fill('#f1f5f9');
        doc.rect(PAGE_X, y, PAGE_WIDTH, 24).stroke('#cbd5e1');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + 24).stroke('#cbd5e1');
        });
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(`TOTAL CONSOLIDADO (${rows.length} transações)`, 50, y + 7.5);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(gross), 458, y + 6.5, { align: 'right', width: 87 });
        y += 30;
      }
    } else if (type === 'appointments') {
      const appointments = await prisma.appointment.findMany({
        where: { date: { gte: start, lte: end } },
        include: {
          tutor: { select: { name: true } },
          pet: { select: { name: true, species: true } },
          service: { select: { name: true, price: true } },
          establishment: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      });

      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 48, 5).fill('#f8fafc');
      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 48, 5).stroke('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('RESUMO DE AGENDAMENTOS OPERACIONAIS', PAGE_X + 12, y + 10);
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
      doc.text(`Total de agendamentos no período: ${appointments.length}`, PAGE_X + 12, y + 28);
      const totalAppointmentsValue = appointments.reduce((s, a) => s + (a.service?.price || 0), 0);
      doc.text(`Valor total estimado: ${formatCurrency(totalAppointmentsValue)}`, PAGE_X + 270, y + 28);

      y += 62;

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Relação Completa de Atendimentos', PAGE_X, y);
      y += 16;

      y = drawTableHead(y);

      const dividers = [110, 182, 322, 417, 465];
      appointments.forEach((a, i) => {
        doc.fontSize(7.5).font('Helvetica');
        const h1 = doc.heightOfString(`${a.tutor.name} (${a.pet.name})`, { width: 132 });
        const h2 = doc.heightOfString(a.service?.name || 'Serviço', { width: 87 });
        const rowHeight = Math.max(20, Math.ceil(Math.max(h1, h2) + 7));

        if (y + rowHeight > 730) {
          doc.addPage();
          drawSubsequentHeader();
          y = drawTableHead(80);
        }

        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).fill(bg);
        doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).stroke('#e2e8f0');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke('#e2e8f0');
        });

        const textY = y + 5.5;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(`#AGD-${a.id.slice(0, 6).toUpperCase()}`, 49, textY, { width: 58, ellipsis: true });
        doc.font('Helvetica').fillColor('#1e293b').text(formatDate(a.date), 114, textY, { width: 65 });
        doc.text(`${a.tutor.name} (${a.pet.name})`, 186, textY, { width: 132 });
        doc.text(a.service?.name || 'Serviço', 326, textY, { width: 87 });
        doc.font('Helvetica-Bold').fillColor(getStatusColor(a.status)).text(formatStatus(a.status), 421, textY, { width: 40, ellipsis: true });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(a.service?.price || 0), 469, textY, { align: 'right', width: 77 });

        y += rowHeight;
      });
    } else if (type === 'pets') {
      const pets = await prisma.pet.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
      });
      const totalPets = await prisma.pet.count();

      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 48, 5).fill('#f8fafc');
      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 48, 5).stroke('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('RESUMO DO PLANTEL DE PETS', PAGE_X + 12, y + 10);
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
      doc.text(`Novos pets no período: ${pets.length}`, PAGE_X + 12, y + 28);
      doc.text(`Total geral ativo na plataforma: ${totalPets}`, PAGE_X + 270, y + 28);

      y += 62;

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Relação de Animais Registrados', PAGE_X, y);
      y += 16;

      y = drawTableHead(y);

      const dividers = [155, 220, 345, 420, 465];
      pets.forEach((p, i) => {
        doc.fontSize(7.5).font('Helvetica');
        const h1 = doc.heightOfString(p.name, { width: 102 });
        const h2 = doc.heightOfString(p.breed || 'SRD', { width: 117 });
        const rowHeight = Math.max(20, Math.ceil(Math.max(h1, h2) + 7));

        if (y + rowHeight > 730) {
          doc.addPage();
          drawSubsequentHeader();
          y = drawTableHead(80);
        }

        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).fill(bg);
        doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).stroke('#e2e8f0');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke('#e2e8f0');
        });

        const textY = y + 5.5;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b').text(p.name, 49, textY, { width: 102 });
        doc.font('Helvetica').fillColor('#475569').text(p.species, 159, textY, { width: 57, ellipsis: true });
        doc.text(p.breed || 'SRD', 224, textY, { width: 117 });
        doc.text(`${p.weight ? p.weight + ' kg' : '-'} / ${p.approximateAge || '-'}`, 349, textY, { width: 67 });
        doc.text(formatDateShort(p.createdAt), 424, textY, { width: 38 });
        doc.font('Helvetica-Bold').fillColor('#059669').text('Ativo', 469, textY, { width: 77 });

        y += rowHeight;
      });
    } else if (type === 'moderation') {
      const reports = await prisma.moderationReport.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          reporter: { select: { name: true } },
          reportedUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 48, 5).fill('#f8fafc');
      doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 48, 5).stroke('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('RESUMO DA MODERAÇÃO E OUVIDORIA', PAGE_X + 12, y + 10);
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
      doc.text(`Total de ocorrências no período: ${reports.length}`, PAGE_X + 12, y + 28);

      y += 62;

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Ocorrências Registradas', PAGE_X, y);
      y += 16;

      y = drawTableHead(y);

      const dividers = [110, 160, 255, 350, 455];
      reports.forEach((r, i) => {
        doc.fontSize(7.5).font('Helvetica');
        const h1 = doc.heightOfString(r.reason, { width: 97 });
        const rowHeight = Math.max(20, Math.ceil(h1 + 7));

        if (y + rowHeight > 730) {
          doc.addPage();
          drawSubsequentHeader();
          y = drawTableHead(80);
        }

        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).fill(bg);
        doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).stroke('#e2e8f0');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke('#e2e8f0');
        });

        const textY = y + 5.5;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(`#${r.reportNumber}`, 49, textY, { width: 58, ellipsis: true });
        doc.font('Helvetica').fillColor('#1e293b').text(formatDateShort(r.createdAt), 114, textY, { width: 42 });
        doc.text(r.reporter?.name || 'Anônimo', 164, textY, { width: 87, ellipsis: true });
        doc.text(r.reportedUser?.name || 'Perfil', 259, textY, { width: 87, ellipsis: true });
        doc.text(r.reason, 354, textY, { width: 97 });
        doc.font('Helvetica-Bold').fillColor(getStatusColor(r.status)).text(formatStatus(r.status), 459, textY, { width: 87, ellipsis: true });

        y += rowHeight;
      });
    }

    // Footers & Page numbering on ALL pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
      doc.text(
        `PetHub Centro de Controle Operacional — Página ${i + 1} de ${range.count} — Emitido em ${generatedAtStr}`,
        PAGE_X,
        785,
        { align: 'center', width: PAGE_WIDTH, lineBreak: false }
      );
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="pethub_${type}_${Date.now()}.pdf"`)
          .send(result);
        resolve(undefined);
      });
    });
  },

  async generateCsv(type: string, start: Date, end: Date, reply: FastifyReply) {
    let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel in pt-BR

    if (type === 'finance') {
      csv += 'Tipo;Código;Data;Cliente;Descrição;Status;Valor (R$)\r\n';
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { tutor: { select: { name: true } } },
      });
      orders.forEach((o) => {
        csv += `Pedido;#PED-${o.id.slice(0, 6).toUpperCase()};${formatDate(o.createdAt)};"${o.tutor?.name || ''}";"Itens do pedido";${o.status};${o.totalAmount.toFixed(2)}\r\n`;
      });
    } else if (type === 'appointments') {
      csv += 'Código;Data/Hora;Tutor;Pet;Espécie;Serviço;Status;Valor (R$)\r\n';
      const apps = await prisma.appointment.findMany({
        where: { date: { gte: start, lte: end } },
        include: {
          tutor: { select: { name: true } },
          pet: { select: { name: true, species: true } },
          service: { select: { name: true, price: true } },
        },
      });
      apps.forEach((a) => {
        csv += `#AGD-${a.id.slice(0, 6).toUpperCase()};${formatDate(a.date)};"${a.tutor.name}";"${a.pet.name}";${a.pet.species};"${a.service?.name || ''}";${a.status};${(a.service?.price || 0).toFixed(2)}\r\n`;
      });
    } else if (type === 'pets') {
      csv += 'ID;Nome;Espécie;Raça;Sexo;Peso (kg);Idade Aprox;Data Cadastro\r\n';
      const pets = await prisma.pet.findMany({
        where: { createdAt: { gte: start, lte: end } },
      });
      pets.forEach((p) => {
        csv += `"${p.id}";"${p.name}";"${p.species}";"${p.breed || ''}";"${p.gender || ''}";"${p.weight || ''}";"${p.approximateAge || ''}";${formatDate(p.createdAt)}\r\n`;
      });
    } else if (type === 'moderation') {
      csv += 'Protocolo;Data;Denunciante;Denunciado;Motivo;Status\r\n';
      const reports = await prisma.moderationReport.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          reporter: { select: { name: true } },
          reportedUser: { select: { name: true } },
        },
      });
      reports.forEach((r) => {
        csv += `#${r.reportNumber};${formatDate(r.createdAt)};"${r.reporter?.name || 'Anônimo'}";"${r.reportedUser?.name || 'Perfil'}";"${r.reason}";${r.status}\r\n`;
      });
    }

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="pethub_${type}_${Date.now()}.csv"`)
      .send(Buffer.from(csv, 'utf-8'));
  },
};
