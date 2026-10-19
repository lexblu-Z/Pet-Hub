import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { AppointmentStatus, OrderStatus } from '@prisma/client';
import {
  PDF_PAGE_X,
  PDF_PAGE_WIDTH,
  PDF_BOTTOM_LIMIT,
  PDF_FOOTER_Y,
  PDF_CELL_PADDING_X,
  PDF_CELL_PADDING_TOP,
  renderOfficialPdfLogo,
  renderCompactPdfLogo,
  calculateRowHeight,
  formatPdfDateTimeBr,
  formatPdfDateShortBr,
  formatPdfCurrency,
} from '../utils/pdfCommon';

const exportQuerySchema = z.object({
  type: z.enum(['finance', 'appointments', 'pets', 'moderation']),
  format: z.enum(['pdf', 'csv']).default('pdf'),
  period: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

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

interface TableColumnDef {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

interface TableCellDef {
  text: string;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bold?: boolean;
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
    const generatedAtStr = formatPdfDateTimeBr(new Date());

    const typeTitleMap: Record<string, string> = {
      finance: 'RELATÓRIO FINANCEIRO & CONTÁBIL',
      appointments: 'RELATÓRIO DE AGENDAMENTOS',
      pets: 'RELATÓRIO DO PLANTEL DE PETS',
      moderation: 'RELATÓRIO DE MODERAÇÃO',
    };
    const typeTitle = typeTitleMap[type] || `RELATÓRIO: ${type.toUpperCase()}`;

    const PAGE_X = PDF_PAGE_X;
    const PAGE_WIDTH = PDF_PAGE_WIDTH;
    const BOTTOM_LIMIT = PDF_BOTTOM_LIMIT;

    // --- Page 1 Header Banner ---
    doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 68, 6).fill('#0f172a');

    // Official Logo insertion with protective white badge container
    renderOfficialPdfLogo(doc, PAGE_X + 8, 51);

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#f97316').text('CENTRO DE CONTROLE OPERACIONAL', PAGE_X + 122, 57);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff').text(typeTitle, PAGE_X + 122, 70, { width: 220, lineBreak: false, ellipsis: true });

    doc.fontSize(8).font('Helvetica').fillColor('#cbd5e1').text(`Período: ${periodStr}`, PAGE_X + 345, 57, { align: 'right', width: 150 });
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado em: ${generatedAtStr}`, PAGE_X + 345, 71, { align: 'right', width: 150 });
    doc.fontSize(7).font('Helvetica').fillColor('#f97316').text('Documento Oficial PetHub', PAGE_X + 345, 84, { align: 'right', width: 150 });

    let y = 125;

    // Helper to draw subsequent page compact headers
    const drawSubsequentHeader = () => {
      doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 26, 4).fill('#0f172a');
      renderCompactPdfLogo(doc, PAGE_X + 6, 49);
      doc.fontSize(8).font('Helvetica').fillColor('#ffffff').text(`|  ${typeTitle} (${periodStr})`, PAGE_X + 48, 53, { width: 290, ellipsis: true });
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado: ${generatedAtStr}`, PAGE_X + 340, 53, { align: 'right', width: 155 });
    };

    // Generic Table Renderer supporting dynamic heights across ALL columns and clean Z-order
    const renderTable = (
      columns: TableColumnDef[],
      rows: TableCellDef[][],
      initialY: number
    ): number => {
      // Calculate dividers dynamically
      const dividers: number[] = [];
      let curX = PAGE_X;
      for (let i = 0; i < columns.length - 1; i++) {
        curX += columns[i].width;
        dividers.push(curX);
      }

      // Draw table header
      const drawTableHead = (currentY: number): number => {
        const headerH = 22;
        doc.rect(PAGE_X, currentY, PAGE_WIDTH, headerH).fill('#1e293b');
        doc.rect(PAGE_X, currentY, PAGE_WIDTH, headerH).stroke('#0f172a');

        dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + headerH).stroke('#334155'));

        let colX = PAGE_X;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');

        for (const col of columns) {
          const align = col.align || 'left';
          const textX = colX + PDF_CELL_PADDING_X;
          const textW = col.width - (PDF_CELL_PADDING_X * 2);

          doc.text(col.label.toUpperCase(), textX, currentY + 7, {
            width: textW,
            align: align,
            lineBreak: false,
            ellipsis: true,
          });
          colX += col.width;
        }

        return currentY + headerH;
      };

      let currentY = drawTableHead(initialY);

      if (rows.length === 0) {
        doc.roundedRect(PAGE_X, currentY, PAGE_WIDTH, 30, 3).fill('#f8fafc');
        doc.roundedRect(PAGE_X, currentY, PAGE_WIDTH, 30, 3).stroke('#e2e8f0');
        doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8').text(
          'Nenhum registro localizado para o período selecionado.',
          PAGE_X,
          currentY + 10,
          { align: 'center', width: PAGE_WIDTH }
        );
        return currentY + 36;
      }

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];

        // 1. Dynamic row height calculation inspecting ALL columns with exact available text width
        const rowHeight = calculateRowHeight(doc, columns, row, 7.5);

        // 2. Pagination check (never split row across page boundary)
        if (currentY + rowHeight > BOTTOM_LIMIT) {
          doc.addPage();
          drawSubsequentHeader();
          currentY = drawTableHead(80);
        }

        // 3. Draw backgrounds and borders FIRST (prevents lines or fills from cutting text)
        const isEven = r % 2 === 0;
        doc.rect(PAGE_X, currentY, PAGE_WIDTH, rowHeight).fill(isEven ? '#ffffff' : '#f8fafc');
        doc.rect(PAGE_X, currentY, PAGE_WIDTH, rowHeight).stroke('#e2e8f0');

        dividers.forEach((x) => {
          doc.moveTo(x, currentY).lineTo(x, currentY + rowHeight).stroke('#e2e8f0');
        });

        // 4. Draw texts ON TOP with generous vertical padding preventing baseline/descender clipping
        let cellX = PAGE_X;
        const textY = currentY + PDF_CELL_PADDING_TOP;

        for (let c = 0; c < columns.length; c++) {
          const colDef = columns[c];
          if (!colDef) continue;

          const cellData = row[c] || { text: '-' };
          const align = cellData.align || colDef.align || 'left';
          const textColor = cellData.color || '#1e293b';
          const isBold = cellData.bold || false;

          doc.fontSize(7.5)
            .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
            .fillColor(textColor);

          const textX = cellX + PDF_CELL_PADDING_X;
          const textW = colDef.width - (PDF_CELL_PADDING_X * 2);

          doc.text(cellData.text, textX, textY, {
            width: textW,
            align: align,
          });

          cellX += colDef.width;
        }

        currentY += rowHeight;
      }

      return currentY;
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
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatPdfCurrency(gross), PAGE_X + 115, y + 28);

      doc.font('Helvetica').fillColor('#475569').text(`Taxas Plataforma (10%):`, PAGE_X + 12, y + 43);
      doc.font('Helvetica-Bold').fillColor('#ea580c').text(formatPdfCurrency(platformFee), PAGE_X + 115, y + 43);

      doc.font('Helvetica').fillColor('#475569').text(`Cashback Resgatado:`, PAGE_X + 270, y + 28);
      doc.font('Helvetica-Bold').fillColor('#7c3aed').text(formatPdfCurrency(cashbackUsed), PAGE_X + 380, y + 28);

      doc.font('Helvetica').fillColor('#475569').text(`Faturamento Líquido:`, PAGE_X + 270, y + 43);
      doc.font('Helvetica-Bold').fillColor('#0284c7').text(formatPdfCurrency(net), PAGE_X + 380, y + 43);

      doc.font('Helvetica').fillColor('#64748b').text(
        `Total de Transações Concluídas: ${appointments.length + orders.length} (${appointments.length} agendamentos + ${orders.length} pedidos em loja)`,
        PAGE_X + 12,
        y + 59
      );

      y += 92;

      // Section Title
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Detalhamento de Transações Contábeis', PAGE_X, y);
      y += 16;

      const financeColumns: TableColumnDef[] = [
        { label: 'Tipo', width: 74, align: 'left' },
        { label: 'Data', width: 50, align: 'left' },
        { label: 'Código / Detalhamento', width: 166, align: 'left' },
        { label: 'Método', width: 75, align: 'left' },
        { label: 'Status', width: 55, align: 'left' },
        { label: 'Valor', width: 85, align: 'right' },
      ];

      type TransactionRow = {
        type: string;
        date: Date;
        code: string;
        desc: string;
        method: string;
        status: string;
        amount: number;
      };

      const rawRows: TransactionRow[] = [
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

      const tableRows: TableCellDef[][] = rawRows.map((r) => [
        { text: r.type, bold: true, color: '#475569' },
        { text: formatPdfDateShortBr(r.date) },
        { text: `${r.code} - ${r.desc}` },
        { text: r.method },
        { text: formatStatus(r.status), bold: true, color: getStatusColor(r.status) },
        { text: formatPdfCurrency(r.amount), bold: true, align: 'right' },
      ]);

      y = renderTable(financeColumns, tableRows, y);

      // Render Total Summary Row with proper pagination check
      if (rawRows.length > 0) {
        if (y + 28 > BOTTOM_LIMIT) {
          doc.addPage();
          drawSubsequentHeader();
          y = 80;
        }

        const totalRowH = 26;
        doc.rect(PAGE_X, y, PAGE_WIDTH, totalRowH).fill('#f1f5f9');
        doc.rect(PAGE_X, y, PAGE_WIDTH, totalRowH).stroke('#cbd5e1');

        // Vertical divider before total amount
        const lastDivX = PAGE_X + PAGE_WIDTH - 85;
        doc.moveTo(lastDivX, y).lineTo(lastDivX, y + totalRowH).stroke('#cbd5e1');

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(
          `TOTAL CONSOLIDADO (${rawRows.length} transações)`,
          PAGE_X + PDF_CELL_PADDING_X,
          y + 8
        );
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(
          formatPdfCurrency(gross),
          PAGE_X + PAGE_WIDTH - 85 + PDF_CELL_PADDING_X,
          y + 7,
          { align: 'right', width: 85 - (PDF_CELL_PADDING_X * 2) }
        );
        y += totalRowH + 16;
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
      doc.text(`Valor total estimado: ${formatPdfCurrency(totalAppointmentsValue)}`, PAGE_X + 270, y + 28);

      y += 62;

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Relação Completa de Atendimentos', PAGE_X, y);
      y += 16;

      const appointmentColumns: TableColumnDef[] = [
        { label: 'Código', width: 65, align: 'left' },
        { label: 'Data/Hora', width: 75, align: 'left' },
        { label: 'Tutor / Pet', width: 135, align: 'left' },
        { label: 'Serviço', width: 95, align: 'left' },
        { label: 'Status', width: 55, align: 'left' },
        { label: 'Valor', width: 80, align: 'right' },
      ];

      const tableRows: TableCellDef[][] = appointments.map((a) => [
        { text: `#AGD-${a.id.slice(0, 6).toUpperCase()}`, bold: true, color: '#475569' },
        { text: formatPdfDateTimeBr(a.date) },
        { text: `${a.tutor.name} (${a.pet.name})` },
        { text: a.service?.name || 'Serviço' },
        { text: formatStatus(a.status), bold: true, color: getStatusColor(a.status) },
        { text: formatPdfCurrency(a.service?.price || 0), bold: true, align: 'right' },
      ]);

      y = renderTable(appointmentColumns, tableRows, y);
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

      const petColumns: TableColumnDef[] = [
        { label: 'Nome do Pet', width: 105, align: 'left' },
        { label: 'Espécie', width: 65, align: 'left' },
        { label: 'Raça', width: 125, align: 'left' },
        { label: 'Peso / Idade', width: 85, align: 'left' },
        { label: 'Cadastro', width: 55, align: 'left' },
        { label: 'Status', width: 70, align: 'left' },
      ];

      const tableRows: TableCellDef[][] = pets.map((p) => [
        { text: p.name, bold: true, color: '#1e293b' },
        { text: p.species },
        { text: p.breed || 'SRD' },
        { text: `${p.weight ? p.weight + ' kg' : '-'} / ${p.approximateAge || '-'}` },
        { text: formatPdfDateShortBr(p.createdAt) },
        { text: 'Ativo', bold: true, color: '#059669' },
      ]);

      y = renderTable(petColumns, tableRows, y);
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

      const modColumns: TableColumnDef[] = [
        { label: 'Protocolo', width: 65, align: 'left' },
        { label: 'Data', width: 50, align: 'left' },
        { label: 'Denunciante', width: 95, align: 'left' },
        { label: 'Denunciado', width: 95, align: 'left' },
        { label: 'Motivo', width: 110, align: 'left' },
        { label: 'Status', width: 90, align: 'left' },
      ];

      const tableRows: TableCellDef[][] = reports.map((r) => [
        { text: `#${r.reportNumber}`, bold: true, color: '#475569' },
        { text: formatPdfDateShortBr(r.createdAt) },
        { text: r.reporter?.name || 'Anônimo' },
        { text: r.reportedUser?.name || 'Perfil' },
        { text: r.reason },
        { text: formatStatus(r.status), bold: true, color: getStatusColor(r.status) },
      ]);

      y = renderTable(modColumns, tableRows, y);
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
        PDF_FOOTER_Y,
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
        csv += `Pedido;#PED-${o.id.slice(0, 6).toUpperCase()};${formatPdfDateTimeBr(o.createdAt)};"${o.tutor?.name || ''}";"Itens do pedido";${o.status};${o.totalAmount.toFixed(2)}\r\n`;
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
        csv += `#AGD-${a.id.slice(0, 6).toUpperCase()};${formatPdfDateTimeBr(a.date)};"${a.tutor.name}";"${a.pet.name}";${a.pet.species};"${a.service?.name || ''}";${a.status};${(a.service?.price || 0).toFixed(2)}\r\n`;
      });
    } else if (type === 'pets') {
      csv += 'ID;Nome;Espécie;Raça;Sexo;Peso (kg);Idade Aprox;Data Cadastro\r\n';
      const pets = await prisma.pet.findMany({
        where: { createdAt: { gte: start, lte: end } },
      });
      pets.forEach((p) => {
        csv += `"${p.id}";"${p.name}";"${p.species}";"${p.breed || ''}";"${p.gender || ''}";"${p.weight || ''}";"${p.approximateAge || ''}";${formatPdfDateTimeBr(p.createdAt)}\r\n`;
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
        csv += `#${r.reportNumber};${formatPdfDateTimeBr(r.createdAt)};"${r.reporter?.name || 'Anônimo'}";"${r.reportedUser?.name || 'Perfil'}";"${r.reason}";${r.status}\r\n`;
      });
    }

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="pethub_${type}_${Date.now()}.csv"`)
      .send(Buffer.from(csv, 'utf-8'));
  },
};
