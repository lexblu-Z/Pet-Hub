import PDFDocument from 'pdfkit';
import { FastifyReply } from 'fastify';
import {
  PDF_PAGE_X,
  PDF_PAGE_WIDTH,
  PDF_BOTTOM_LIMIT,
  PDF_CELL_PADDING_X,
  PDF_CELL_PADDING_TOP,
  PDF_FOOTER_Y,
  renderOfficialPdfLogo,
  renderCompactPdfLogo,
  calculateRowHeight,
  formatPdfDateTimeBr,
} from '../utils/pdfCommon';

export interface ReportPdfMetadata {
  reportType: 'services' | 'financial' | 'customers' | 'inventory';
  scope: 'ESTABELECIMENTO' | 'PROFISSIONAL';
  entityName: string;
  documentNumber?: string | null;
  startDateStr: string;
  endDateStr: string;
  summaryCards: Array<{ label: string; value: string }>;
  tableHeaders: Array<{ label: string; width: number; align?: 'left' | 'center' | 'right' }>;
  tableRows: Array<Array<{ text: string; align?: 'left' | 'center' | 'right'; color?: string; bold?: boolean }>>;
}

export const reportsPdfService = {
  async generateReportPdf(metadata: ReportPdfMetadata, reply: FastifyReply) {
    // Official standard: A4 Portrait (595.28 x 841.89 pt), margins: 45pt, printable width: 505pt
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 45,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const PAGE_X = PDF_PAGE_X;
    const PAGE_WIDTH = PDF_PAGE_WIDTH;
    const BOTTOM_LIMIT = PDF_BOTTOM_LIMIT;

    const generatedAtStr = formatPdfDateTimeBr(new Date());
    const periodStr = `${metadata.startDateStr} a ${metadata.endDateStr}`;

    const titleMap: Record<string, string> = {
      services: 'RELATÓRIO GERENCIAL DE SERVIÇOS',
      financial: 'RELATÓRIO FINANCEIRO & FATURAMENTO',
      customers: 'RELATÓRIO DE CLIENTES & PETS',
      inventory: 'RELATÓRIO DE POSIÇÃO DE ESTOQUE',
    };
    const reportTitle = titleMap[metadata.reportType] || 'RELATÓRIO GERENCIAL';

    // 1. Helper: Draw Main Header (Page 1)
    const drawMainHeader = () => {
      doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 68, 6).fill('#0f172a');

      // Official Logo with protective badge container
      renderOfficialPdfLogo(doc, PAGE_X + 8, 51);

      // Center title and subtag
      const scopeLabel = metadata.scope === 'ESTABELECIMENTO' ? 'PAINEL DO ESTABELECIMENTO' : 'PAINEL DO PROFISSIONAL';
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#f97316').text(scopeLabel, PAGE_X + 122, 56);
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#ffffff').text(reportTitle, PAGE_X + 122, 68, { width: 220, lineBreak: false, ellipsis: true });
      const entityStr = `Titular: ${metadata.entityName}${metadata.documentNumber ? ` • ${metadata.documentNumber}` : ''}`;
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(entityStr, PAGE_X + 122, 82, { width: 220, lineBreak: false, ellipsis: true });

      // Right-aligned metadata
      doc.fontSize(8).font('Helvetica').fillColor('#cbd5e1').text(`Período: ${periodStr}`, PAGE_X + 345, 57, { align: 'right', width: 150 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado em: ${generatedAtStr}`, PAGE_X + 345, 71, { align: 'right', width: 150 });
      doc.fontSize(7).font('Helvetica').fillColor('#f97316').text('Documento Oficial PetHub', PAGE_X + 345, 84, { align: 'right', width: 150 });
    };

    // 2. Helper: Subsequent page compact header
    const drawSubsequentHeader = () => {
      doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 26, 4).fill('#0f172a');
      renderCompactPdfLogo(doc, PAGE_X + 6, 49);
      doc.fontSize(8).font('Helvetica').fillColor('#ffffff').text(`|  ${reportTitle} (${periodStr})`, PAGE_X + 48, 53, { width: 290, ellipsis: true });
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado: ${generatedAtStr}`, PAGE_X + 340, 53, { align: 'right', width: 155 });
    };

    // 3. Helper: Draw Summary KPIs (Page 1 only)
    const drawSummaryCards = (startY: number): number => {
      const cards = metadata.summaryCards;
      if (!cards || cards.length === 0) return startY;

      const cardHeight = cards.length > 2 ? 68 : 50;
      doc.roundedRect(PAGE_X, startY, PAGE_WIDTH, cardHeight, 5).fill('#f8fafc');
      doc.roundedRect(PAGE_X, startY, PAGE_WIDTH, cardHeight, 5).stroke('#e2e8f0');

      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('CONSOLIDAÇÃO OPERACIONAL OFICIAL', PAGE_X + 12, startY + 10);

      const col1X = PAGE_X + 12;
      const col2X = PAGE_X + 260;

      cards.forEach((c, idx) => {
        const isSecondCol = idx % 2 === 1;
        const rowIdx = Math.floor(idx / 2);
        const posX = isSecondCol ? col2X : col1X;
        const posY = startY + 28 + (rowIdx * 16);

        doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(`${c.label}:`, posX, posY);
        const labelWidth = doc.widthOfString(`${c.label}: `);
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(c.value, posX + labelWidth + 4, posY);
      });

      return startY + cardHeight + 14;
    };

    // 4. Normalize Column Widths so sum is strictly 505pt
    const totalInputWidth = metadata.tableHeaders.reduce((s, h) => s + h.width, 0);
    const normalizedHeaders = metadata.tableHeaders.map((h, i, arr) => {
      if (i === arr.length - 1) {
        const prevSum = arr.slice(0, i).reduce((s, prev) => s + Math.round((prev.width / totalInputWidth) * PAGE_WIDTH), 0);
        return { ...h, width: PAGE_WIDTH - prevSum };
      }
      return { ...h, width: Math.round((h.width / totalInputWidth) * PAGE_WIDTH) };
    });

    // Compute divider X positions
    const dividers: number[] = [];
    let curDivX = PAGE_X;
    for (let i = 0; i < normalizedHeaders.length - 1; i++) {
      curDivX += normalizedHeaders[i].width;
      dividers.push(curDivX);
    }

    // 5. Helper: Draw Table Headers
    const drawTableHead = (currentY: number) => {
      const rowHeight = 22;
      doc.rect(PAGE_X, currentY, PAGE_WIDTH, rowHeight).fill('#1e293b');
      doc.rect(PAGE_X, currentY, PAGE_WIDTH, rowHeight).stroke('#0f172a');

      dividers.forEach((x) => doc.moveTo(x, currentY).lineTo(x, currentY + rowHeight).stroke('#334155'));

      let currentX = PAGE_X;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');

      for (const col of normalizedHeaders) {
        const align = col.align || 'left';
        const textX = currentX + PDF_CELL_PADDING_X;
        const textW = col.width - (PDF_CELL_PADDING_X * 2);

        doc.text(col.label.toUpperCase(), textX, currentY + 7, {
          width: textW,
          align: align,
          lineBreak: false,
          ellipsis: true,
        });
        currentX += col.width;
      }

      return currentY + rowHeight;
    };

    // --- Page 1 Render ---
    drawMainHeader();
    let currentY = 125;

    currentY = drawSummaryCards(currentY);

    // Section Title
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Detalhamento de Registros Operacionais', PAGE_X, currentY);
    currentY += 16;

    currentY = drawTableHead(currentY);

    // --- Render Rows ---
    const rows = metadata.tableRows;
    if (rows.length === 0) {
      doc.roundedRect(PAGE_X, currentY, PAGE_WIDTH, 30, 3).fill('#f8fafc');
      doc.roundedRect(PAGE_X, currentY, PAGE_WIDTH, 30, 3).stroke('#e2e8f0');
      doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8').text(
        'Nenhum registro localizado para os filtros e período selecionados.',
        PAGE_X,
        currentY + 10,
        { width: PAGE_WIDTH, align: 'center' }
      );
      currentY += 36;
    } else {
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];

        // 1. Calculate row height dynamically based on longest cell text across ALL columns
        const rowCells = normalizedHeaders.map((col, idx) => ({
          text: row[idx]?.text || '-',
          bold: row[idx]?.bold || false,
        }));
        const rowHeight = calculateRowHeight(doc, normalizedHeaders, rowCells, 7.5);

        // 2. Check if page break is required
        if (currentY + rowHeight > BOTTOM_LIMIT) {
          doc.addPage();
          drawSubsequentHeader();
          currentY = drawTableHead(80);
        }

        // 3. Row background (zebra striping) & borders (drawn first to guarantee text remains on top)
        const isEven = r % 2 === 0;
        doc.rect(PAGE_X, currentY, PAGE_WIDTH, rowHeight).fill(isEven ? '#ffffff' : '#f8fafc');
        doc.rect(PAGE_X, currentY, PAGE_WIDTH, rowHeight).stroke('#e2e8f0');

        dividers.forEach((x) => {
          doc.moveTo(x, currentY).lineTo(x, currentY + rowHeight).stroke('#e2e8f0');
        });

        // 4. Draw columns text on top with safe vertical padding
        let cellX = PAGE_X;
        const textY = currentY + PDF_CELL_PADDING_TOP;

        for (let c = 0; c < row.length; c++) {
          const colDef = normalizedHeaders[c];
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
    }

    // --- Footer with Page Numbers (across all pages) ---
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;

      const footerLabel = metadata.scope === 'ESTABELECIMENTO'
        ? 'PetHub Painel do Estabelecimento'
        : 'PetHub Painel do Profissional';

      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
      doc.text(
        `${footerLabel} — Página ${i + 1} de ${totalPages} — Emitido em ${generatedAtStr}`,
        PAGE_X,
        PDF_FOOTER_Y,
        { align: 'center', width: PAGE_WIDTH, lineBreak: false }
      );
    }

    doc.end();

    return new Promise<void>((resolve, reject) => {
      doc.on('end', () => {
        const finalBuffer = Buffer.concat(chunks);
        const safeType = metadata.reportType;
        const filename = `pethub-relatorio-${safeType}-${metadata.scope.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;

        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(finalBuffer);
        resolve();
      });

      doc.on('error', (err) => {
        reject(err);
      });
    });
  },
};
