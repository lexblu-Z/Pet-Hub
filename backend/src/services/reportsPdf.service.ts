import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { FastifyReply } from 'fastify';

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

function getOfficialLogoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'src/assets/logo_transparent.png'),
    path.resolve(process.cwd(), 'backend/src/assets/logo_transparent.png'),
    path.resolve(process.cwd(), '../backend/src/assets/logo_transparent.png'),
    path.resolve(process.cwd(), 'logo_transparent.png'),
    'C:/Users/leona/OneDrive/Documentos/Projetos/Pet-Hub-main/Pet-Hub-main/backend/src/assets/logo_transparent.png',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function formatNowBr(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

export const reportsPdfService = {
  async generateReportPdf(metadata: ReportPdfMetadata, reply: FastifyReply) {
    const isLandscape = true;
    const doc = new PDFDocument({
      size: 'A4',
      layout: isLandscape ? 'landscape' : 'portrait',
      margin: 35,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const PAGE_WIDTH = isLandscape ? 841.89 : 595.28;
    const PAGE_HEIGHT = isLandscape ? 595.28 : 841.89;
    const MARGIN = 35;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // ~771.89
    const BOTTOM_LIMIT = PAGE_HEIGHT - 45;

    const logoPath = getOfficialLogoPath();
    const generatedAtStr = formatNowBr();
    const periodStr = `${metadata.startDateStr} até ${metadata.endDateStr}`;

    const titleMap: Record<string, string> = {
      services: 'RELATÓRIO GERENCIAL DE SERVIÇOS',
      financial: 'RELATÓRIO FINANCEIRO & FATURAMENTO',
      customers: 'RELATÓRIO DE CLIENTES & PETS',
      inventory: 'RELATÓRIO DE POSIÇÃO DE ESTOQUE',
    };
    const reportTitle = titleMap[metadata.reportType] || 'RELATÓRIO GERENCIAL';

    // Helper: Draw Main Header (Page 1)
    const drawMainHeader = () => {
      const headerHeight = 72;
      doc.roundedRect(MARGIN, MARGIN, CONTENT_WIDTH, headerHeight, 6).fill('#09090b');

      if (logoPath) {
        try {
          doc.image(logoPath, MARGIN + 12, MARGIN + 16, { fit: [140, 40] });
        } catch {
          doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('PetHub', MARGIN + 14, MARGIN + 26);
        }
      } else {
        doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('PetHub', MARGIN + 14, MARGIN + 26);
      }

      // Center title and entity
      const centerStartX = MARGIN + 165;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#f97316').text(
        `PAINEL OFICIAL DE CONTROLE | ${metadata.scope}`,
        centerStartX,
        MARGIN + 14
      );

      doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff').text(
        reportTitle,
        centerStartX,
        MARGIN + 27
      );

      doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8').text(
        `Titular: ${metadata.entityName}${metadata.documentNumber ? ` • ${metadata.documentNumber}` : ''}`,
        centerStartX,
        MARGIN + 46
      );

      // Right-aligned metadata
      const rightX = MARGIN + CONTENT_WIDTH - 210;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#f8fafc').text(
        `Período: ${periodStr}`,
        rightX,
        MARGIN + 14,
        { width: 198, align: 'right' }
      );

      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
        `Emitido em: ${generatedAtStr}`,
        rightX,
        MARGIN + 29,
        { width: 198, align: 'right' }
      );

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#f97316').text(
        'PetHub Enterprise Analytics',
        rightX,
        MARGIN + 45,
        { width: 198, align: 'right' }
      );
    };

    // Helper: Subsequent page header
    const drawSubsequentHeader = () => {
      const headerHeight = 28;
      doc.roundedRect(MARGIN, MARGIN, CONTENT_WIDTH, headerHeight, 4).fill('#09090b');

      if (logoPath) {
        try {
          doc.image(logoPath, MARGIN + 8, MARGIN + 5, { fit: [65, 18] });
        } catch {
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff').text('PetHub', MARGIN + 8, MARGIN + 8);
        }
      } else {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff').text('PetHub', MARGIN + 8, MARGIN + 8);
      }

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff').text(
        `|  ${reportTitle}  •  ${metadata.entityName}  (${periodStr})`,
        MARGIN + 80,
        MARGIN + 9
      );

      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text(
        `Emitido em: ${generatedAtStr}`,
        MARGIN + CONTENT_WIDTH - 200,
        MARGIN + 9,
        { width: 190, align: 'right' }
      );
    };

    // Helper: Draw Summary KPIs (Page 1 only)
    const drawSummaryCards = (startY: number): number => {
      const cards = metadata.summaryCards;
      if (!cards || cards.length === 0) return startY;

      const cardCount = Math.min(cards.length, 5);
      const gap = 8;
      const totalGaps = (cardCount - 1) * gap;
      const cardWidth = (CONTENT_WIDTH - totalGaps) / cardCount;
      const cardHeight = 44;

      for (let i = 0; i < cardCount; i++) {
        const c = cards[i];
        const cardX = MARGIN + i * (cardWidth + gap);

        // Card background and border
        doc.roundedRect(cardX, startY, cardWidth, cardHeight, 4).fill('#f8fafc');
        doc.roundedRect(cardX, startY, cardWidth, cardHeight, 4).lineWidth(0.8).stroke('#e2e8f0');

        // Top accent line
        doc.rect(cardX, startY, cardWidth, 2.5).fill('#f97316');

        // Text
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(
          c.label.toUpperCase(),
          cardX + 8,
          startY + 7,
          { width: cardWidth - 16, align: 'left' }
        );

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#09090b').text(
          c.value,
          cardX + 8,
          startY + 20,
          { width: cardWidth - 16, align: 'left' }
        );
      }

      return startY + cardHeight + 14;
    };

    // Helper: Draw Table Headers
    const drawTableHead = (currentY: number) => {
      const rowHeight = 22;
      doc.rect(MARGIN, currentY, CONTENT_WIDTH, rowHeight).fill('#1e293b');

      let currentX = MARGIN;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');

      for (const col of metadata.tableHeaders) {
        const align = col.align || 'left';
        const textX = align === 'right' ? currentX : currentX + 6;
        const textW = align === 'right' ? col.width - 6 : col.width - 12;

        doc.text(col.label.toUpperCase(), textX, currentY + 6.5, {
          width: textW,
          align: align,
        });
        currentX += col.width;
      }

      return currentY + rowHeight;
    };

    // --- Page 1 Render ---
    drawMainHeader();
    let currentY = MARGIN + 72 + 12;

    currentY = drawSummaryCards(currentY);
    currentY = drawTableHead(currentY);

    // --- Render Rows ---
    const rows = metadata.tableRows;
    if (rows.length === 0) {
      doc.rect(MARGIN, currentY, CONTENT_WIDTH, 36).fill('#ffffff');
      doc.rect(MARGIN, currentY, CONTENT_WIDTH, 36).stroke('#e2e8f0');
      doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(
        'Nenhum registro localizado para os filtros e período selecionados.',
        MARGIN,
        currentY + 13,
        { width: CONTENT_WIDTH, align: 'center' }
      );
      currentY += 36;
    } else {
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];

        // 1. Calculate row height dynamically based on longest text column
        let maxColHeight = 16;
        for (let c = 0; c < row.length; c++) {
          const colDef = metadata.tableHeaders[c];
          if (!colDef) continue;
          const text = row[c]?.text || '-';
          doc.font('Helvetica').fontSize(7.5);
          const h = doc.heightOfString(text, {
            width: colDef.width - 12,
          });
          if (h + 8 > maxColHeight) {
            maxColHeight = h + 8;
          }
        }
        const rowHeight = Math.max(18, Math.min(maxColHeight, 60)); // bound between 18 and 60pt

        // 2. Check if page break is required
        if (currentY + rowHeight > BOTTOM_LIMIT) {
          doc.addPage();
          drawSubsequentHeader();
          currentY = MARGIN + 28 + 10;
          currentY = drawTableHead(currentY);
        }

        // 3. Row background (zebra stripes)
        const isEven = r % 2 === 0;
        doc.rect(MARGIN, currentY, CONTENT_WIDTH, rowHeight).fill(isEven ? '#ffffff' : '#f8fafc');

        // Row bottom divider
        doc.moveTo(MARGIN, currentY + rowHeight)
          .lineTo(MARGIN + CONTENT_WIDTH, currentY + rowHeight)
          .lineWidth(0.5)
          .stroke('#e2e8f0');

        // 4. Draw columns text
        let cellX = MARGIN;
        for (let c = 0; c < row.length; c++) {
          const colDef = metadata.tableHeaders[c];
          if (!colDef) continue;

          const cellData = row[c] || { text: '-' };
          const align = cellData.align || colDef.align || 'left';
          const textColor = cellData.color || '#1e293b';
          const isBold = cellData.bold || false;

          doc.fontSize(7.5)
            .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
            .fillColor(textColor);

          const textX = align === 'right' ? cellX : cellX + 6;
          const textW = align === 'right' ? colDef.width - 6 : colDef.width - 12;

          doc.text(cellData.text, textX, currentY + 5, {
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

      // Bottom divider line
      const footerY = PAGE_HEIGHT - 28;
      doc.moveTo(MARGIN, footerY)
        .lineTo(MARGIN + CONTENT_WIDTH, footerY)
        .lineWidth(0.6)
        .stroke('#cbd5e1');

      doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(
        'PetHub Gestão Inteligente • Documento emitido eletronicamente para fins de controle e conformidade operacional.',
        MARGIN,
        footerY + 6,
        { width: CONTENT_WIDTH - 120, align: 'left', lineBreak: false }
      );

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#09090b').text(
        `Página ${i + 1} de ${totalPages}`,
        MARGIN + CONTENT_WIDTH - 110,
        footerY + 6,
        { width: 110, align: 'right', lineBreak: false }
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
