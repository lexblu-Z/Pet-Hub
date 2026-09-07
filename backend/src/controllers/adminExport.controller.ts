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

function getOfficialLogoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'src/assets/logo.jpg'),
    path.resolve(process.cwd(), '../logo.jpg'),
    path.resolve(process.cwd(), 'logo.jpg'),
    'C:/Users/leona/OneDrive/Documentos/Projetos/Pet Hub/logo.jpg',
    'C:/Users/leona/OneDrive/Documentos/Projetos/Pet Hub/backend/src/assets/logo.jpg',
    'C:/Users/leona/OneDrive/Documentos/Projetos/Pet Hub/pethub-frontend/public/logo.jpg',
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

    // Official Logo insertion
    if (logoPath) {
      try {
        doc.image(logoPath, PAGE_X + 10, 52, { height: 42, fit: [125, 42] });
      } catch {
        doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('PetHub', PAGE_X + 14, 56);
      }
    } else {
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('PetHub', PAGE_X + 14, 56);
    }

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#f97316').text('CENTRO DE CONTROLE OPERACIONAL', PAGE_X + 140, 57);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text(typeTitle, PAGE_X + 140, 70);

    doc.fontSize(8).font('Helvetica').fillColor('#cbd5e1').text(`Período: ${periodStr}`, PAGE_X + 320, 57, { align: 'right', width: 175 });
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado em: ${generatedAtStr}`, PAGE_X + 320, 71, { align: 'right', width: 175 });
    doc.fontSize(7).font('Helvetica').fillColor('#f97316').text('Documento Oficial PetHub', PAGE_X + 320, 84, { align: 'right', width: 175 });

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
        const dividers = [95, 148, 330, 415, 480];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('TIPO', 50, currentY + 6);
        doc.text('DATA', 100, currentY + 6);
        doc.text('CÓDIGO / DETALHAMENTO', 153, currentY + 6);
        doc.text('MÉTODO', 335, currentY + 6);
        doc.text('STATUS', 420, currentY + 6);
        doc.text('VALOR', 484, currentY + 6, { align: 'right', width: 60 });
      } else if (type === 'appointments') {
        const dividers = [110, 185, 330, 425, 485];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('CÓDIGO', 51, currentY + 6);
        doc.text('DATA/HORA', 116, currentY + 6);
        doc.text('TUTOR / PET', 191, currentY + 6);
        doc.text('SERVIÇO', 336, currentY + 6);
        doc.text('STATUS', 431, currentY + 6);
        doc.text('VALOR', 489, currentY + 6, { align: 'right', width: 55 });
      } else if (type === 'pets') {
        const dividers = [165, 245, 365, 445, 505];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('NOME DO PET', 51, currentY + 6);
        doc.text('ESPÉCIE', 171, currentY + 6);
        doc.text('RAÇA', 251, currentY + 6);
        doc.text('PESO / IDADE', 371, currentY + 6);
        doc.text('CADASTRO', 451, currentY + 6);
        doc.text('STATUS', 511, currentY + 6);
      } else if (type === 'moderation') {
        const dividers = [115, 170, 270, 370, 490];
        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + 20).stroke('#334155'));
        doc.text('PROTOCOLO', 51, currentY + 6);
        doc.text('DATA', 121, currentY + 6);
        doc.text('DENUNCIANTE', 176, currentY + 6);
        doc.text('DENUNCIADO', 276, currentY + 6);
        doc.text('MOTIVO', 376, currentY + 6);
        doc.text('STATUS', 496, currentY + 6);
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
        const dividers = [95, 148, 330, 415, 480];
        rows.forEach((r, i) => {
          if (y > 720) {
            doc.addPage();
            drawSubsequentHeader();
            y = drawTableHead(80);
          }

          const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(PAGE_X, y, PAGE_WIDTH, 20).fill(bg);
          doc.rect(PAGE_X, y, PAGE_WIDTH, 20).stroke('#e2e8f0');
          dividers.forEach((x) => {
            doc.moveTo(x, y).lineTo(x, y + 20).stroke('#e2e8f0');
          });

          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(r.type, 50, y + 5.5, { width: 42, ellipsis: true });
          doc.font('Helvetica').fillColor('#1e293b').text(formatDateShort(r.date), 100, y + 5.5, { width: 44 });
          doc.text(`${r.code} - ${r.desc}`, 153, y + 5.5, { width: 172, ellipsis: true });
          doc.text(r.method, 335, y + 5.5, { width: 76, ellipsis: true });
          doc.font('Helvetica-Bold').fillColor('#059669').text(formatStatus(r.status), 420, y + 5.5, { width: 56, ellipsis: true });
          doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(r.amount), 484, y + 5.5, { align: 'right', width: 60 });

          y += 20;
        });

        // Summary Total Row
        doc.rect(PAGE_X, y, PAGE_WIDTH, 22).fill('#f1f5f9');
        doc.rect(PAGE_X, y, PAGE_WIDTH, 22).stroke('#cbd5e1');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + 22).stroke('#cbd5e1');
        });
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(`TOTAL CONSOLIDADO (${rows.length} transações)`, 51, y + 6.5);
        doc.text(formatCurrency(gross), 484, y + 6.5, { align: 'right', width: 60 });
        y += 26;
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

      const dividers = [110, 185, 330, 425, 485];
      appointments.forEach((a, i) => {
        if (y > 720) {
          doc.addPage();
          drawSubsequentHeader();
          y = drawTableHead(80);
        }

        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(PAGE_X, y, PAGE_WIDTH, 20).fill(bg);
        doc.rect(PAGE_X, y, PAGE_WIDTH, 20).stroke('#e2e8f0');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + 20).stroke('#e2e8f0');
        });

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(`#AGD-${a.id.slice(0, 6).toUpperCase()}`, 51, y + 5.5);
        doc.font('Helvetica').fillColor('#1e293b').text(formatDate(a.date), 116, y + 5.5);
        doc.text(`${a.tutor.name} (${a.pet.name})`, 191, y + 5.5, { width: 134, ellipsis: true });
        doc.text(a.service?.name || 'Serviço', 336, y + 5.5, { width: 84, ellipsis: true });
        doc.font('Helvetica-Bold').fillColor('#059669').text(formatStatus(a.status), 431, y + 5.5, { width: 50, ellipsis: true });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(a.service?.price || 0), 489, y + 5.5, { align: 'right', width: 55 });

        y += 20;
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

      const dividers = [165, 245, 365, 445, 505];
      pets.forEach((p, i) => {
        if (y > 720) {
          doc.addPage();
          drawSubsequentHeader();
          y = drawTableHead(80);
        }

        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(PAGE_X, y, PAGE_WIDTH, 20).fill(bg);
        doc.rect(PAGE_X, y, PAGE_WIDTH, 20).stroke('#e2e8f0');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + 20).stroke('#e2e8f0');
        });

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b').text(p.name, 51, y + 5.5, { width: 110, ellipsis: true });
        doc.font('Helvetica').fillColor('#475569').text(p.species, 171, y + 5.5, { width: 70, ellipsis: true });
        doc.text(p.breed || 'SRD', 251, y + 5.5, { width: 110, ellipsis: true });
        doc.text(`${p.weight ? p.weight + ' kg' : '-'} / ${p.approximateAge || '-'}`, 371, y + 5.5, { width: 70 });
        doc.text(formatDateShort(p.createdAt), 451, y + 5.5, { width: 50 });
        doc.font('Helvetica-Bold').fillColor('#059669').text('Ativo', 511, y + 5.5);

        y += 20;
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

      const dividers = [115, 170, 270, 370, 490];
      reports.forEach((r, i) => {
        if (y > 720) {
          doc.addPage();
          drawSubsequentHeader();
          y = drawTableHead(80);
        }

        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(PAGE_X, y, PAGE_WIDTH, 20).fill(bg);
        doc.rect(PAGE_X, y, PAGE_WIDTH, 20).stroke('#e2e8f0');
        dividers.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + 20).stroke('#e2e8f0');
        });

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(`#${r.reportNumber}`, 51, y + 5.5);
        doc.font('Helvetica').fillColor('#1e293b').text(formatDateShort(r.createdAt), 121, y + 5.5);
        doc.text(r.reporter?.name || 'Anônimo', 176, y + 5.5, { width: 90, ellipsis: true });
        doc.text(r.reportedUser?.name || 'Perfil', 276, y + 5.5, { width: 90, ellipsis: true });
        doc.text(r.reason, 376, y + 5.5, { width: 110, ellipsis: true });
        doc.font('Helvetica-Bold').fillColor('#dc2626').text(formatStatus(r.status), 496, y + 5.5, { width: 50, ellipsis: true });

        y += 20;
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
