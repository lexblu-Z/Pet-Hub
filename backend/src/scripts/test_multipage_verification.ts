import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
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
} from '../utils/pdfCommon';

async function generateMultiPageTest() {
  const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true });
  const outPath = path.resolve(__dirname, '../../test_output_pdfs/test_multipage_rendered.pdf');
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const PAGE_X = PDF_PAGE_X;
  const PAGE_WIDTH = PDF_PAGE_WIDTH;
  const BOTTOM_LIMIT = PDF_BOTTOM_LIMIT;

  const generatedAtStr = formatPdfDateTimeBr(new Date());

  // Header 1
  doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 68, 6).fill('#0f172a');
  renderOfficialPdfLogo(doc, PAGE_X + 8, 51);

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#f97316').text('CENTRO DE AUDITORIA E TESTE MULTIPÁGINA', PAGE_X + 122, 57);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff').text('TESTE DE ESTRESSE DE PAGINAÇÃO E CARACTERES', PAGE_X + 122, 70, { width: 220 });
  doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado em: ${generatedAtStr}`, PAGE_X + 345, 71, { align: 'right', width: 150 });

  const drawSubsequentHeader = () => {
    doc.roundedRect(PAGE_X, 45, PAGE_WIDTH, 26, 4).fill('#0f172a');
    renderCompactPdfLogo(doc, PAGE_X + 6, 49);
    doc.fontSize(8).font('Helvetica').fillColor('#ffffff').text('|  RELATÓRIO MULTIPÁGINA AUDITORIA', PAGE_X + 48, 53);
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(`Gerado: ${generatedAtStr}`, PAGE_X + 340, 53, { align: 'right', width: 155 });
  };

  const columns = [
    { label: 'Item', width: 45, align: 'left' as const },
    { label: 'Código', width: 80, align: 'left' as const },
    { label: 'Descrição Detalhada / Caracteres Especiais (g, p, y, ç, q)', width: 220, align: 'left' as const },
    { label: 'Método / Categoria', width: 90, align: 'left' as const },
    { label: 'Valor (R$)', width: 70, align: 'right' as const },
  ];

  const dividers: number[] = [];
  let curX = PAGE_X;
  for (let i = 0; i < columns.length - 1; i++) {
    curX += columns[i].width;
    dividers.push(curX);
  }

  const drawTableHead = (currentY: number) => {
    const h = 22;
    doc.rect(PAGE_X, currentY, PAGE_WIDTH, h).fill('#1e293b');
    doc.rect(PAGE_X, currentY, PAGE_WIDTH, h).stroke('#0f172a');
    dividers.forEach(x => doc.moveTo(x, currentY).lineTo(x, currentY + h).stroke('#334155'));

    let cx = PAGE_X;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    for (const col of columns) {
      doc.text(col.label.toUpperCase(), cx + PDF_CELL_PADDING_X, currentY + 7, {
        width: col.width - (PDF_CELL_PADDING_X * 2),
        align: col.align,
        lineBreak: false,
        ellipsis: true,
      });
      cx += col.width;
    }
    return currentY + h;
  };

  let y = 130;
  y = drawTableHead(y);

  // Generate 45 rows with varying multiline lengths and descenders
  const testDescenders = [
    'Aplicação de pomada oftálmica e hidratação profunda em cão pug com alergia e coceira intensa.',
    'Higienização completa das patas, tosa higiênica e corte de unhas para cão spitz alemão.',
    'Consulta emergencial com veterinário especialista em ortopedia para filhote golden retriever.',
    'Banho medicamentoso com xampu dermatológico antibacteriano para controle de sarna demodécica.',
    'Vacinação antirrábica e polivalente V10 importada com registro no CRMV-SP oficial.',
  ];

  for (let i = 1; i <= 45; i++) {
    const descText = testDescenders[i % testDescenders.length] + ` [Registro #${i} - pgjyçq]`;
    const methodText = i % 2 === 0 ? 'Presencial no Estabelecimento Local' : 'Cartão de Crédito Parcelado em Loja';
    
    const rowCells = [
      { text: `#${i}`, bold: true },
      { text: `COD-${1000 + i}` },
      { text: descText },
      { text: methodText },
      { text: `R$ ${(i * 37.5).toFixed(2)}`, bold: true },
    ];

    const rowHeight = calculateRowHeight(doc, columns, rowCells, 7.5);

    if (y + rowHeight > BOTTOM_LIMIT) {
      doc.addPage();
      drawSubsequentHeader();
      y = drawTableHead(80);
    }

    const isEven = i % 2 === 0;
    doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).fill(isEven ? '#ffffff' : '#f8fafc');
    doc.rect(PAGE_X, y, PAGE_WIDTH, rowHeight).stroke('#e2e8f0');
    dividers.forEach(x => doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke('#e2e8f0'));

    let cx = PAGE_X;
    const textY = y + PDF_CELL_PADDING_TOP;

    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const cell = rowCells[c];
      doc.fontSize(7.5).font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#1e293b');
      doc.text(cell.text, cx + PDF_CELL_PADDING_X, textY, {
        width: col.width - (PDF_CELL_PADDING_X * 2),
        align: col.align,
      });
      cx += col.width;
    }

    y += rowHeight;
  }

  // Footers
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(p);
    doc.page.margins.bottom = 0;
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
    doc.text(
      `PetHub Auditoria e Verificação — Página ${p + 1} de ${range.count} — Emitido em ${generatedAtStr}`,
      PAGE_X,
      PDF_FOOTER_Y,
      { align: 'center', width: PAGE_WIDTH, lineBreak: false }
    );
  }

  doc.end();

  return new Promise((resolve) => {
    stream.on('finish', () => {
      console.log('Multi-page test PDF finished:', outPath);
      resolve(outPath);
    });
  });
}

generateMultiPageTest();
