import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { reportsPdfService, ReportPdfMetadata } from '../src/services/reportsPdf.service';

async function main() {
  console.log('--- TEST MULTIPAGE PDF GENERATION ---');
  const rows: Array<Array<{ text: string; align?: 'left' | 'center' | 'right'; color?: string; bold?: boolean }>> = [];

  for (let i = 1; i <= 35; i++) {
    rows.push([
      { text: `Item Teste de Serviço Operacional Longo e Detalhado Número ${i}`, bold: true },
      { text: `Categoria ${((i % 4) + 1)}` },
      { text: `R$ ${(i * 25.5).toFixed(2).replace('.', ',')}`, align: 'right', bold: true },
      { text: `${100 - i}`, align: 'center' },
      { text: `${i * 3}`, align: 'center' },
      { text: `R$ ${(i * 75).toFixed(2).replace('.', ',')}`, align: 'right', bold: true },
      { text: i % 5 === 0 ? 'Estoque Baixo' : 'Normal', color: i % 5 === 0 ? '#d97706' : '#16a34a', bold: true, align: 'center' },
    ]);
  }

  const meta: ReportPdfMetadata = {
    reportType: 'inventory',
    scope: 'ESTABELECIMENTO',
    entityName: 'Estab2 Ourinhos — Pet Shop & Clínica',
    documentNumber: '12.345.678/0001-90',
    startDateStr: '01/09/2026',
    endDateStr: '30/09/2026',
    summaryCards: [
      { label: 'Total Produtos', value: '35' },
      { label: 'Itens em Estoque', value: '2.450' },
      { label: 'Valor em Estoque', value: 'R$ 185.420,00' },
      { label: 'Vendas Realizadas', value: '1.240' },
    ],
    tableHeaders: [
      { label: 'Produto', width: 202 },
      { label: 'Categoria', width: 110 },
      { label: 'Preço Unitário', width: 90, align: 'right' },
      { label: 'Estoque Atual', width: 80, align: 'center' },
      { label: 'Vendas', width: 80, align: 'center' },
      { label: 'Valor em Estoque', width: 110, align: 'right' },
      { label: 'Situação', width: 100, align: 'center' },
    ],
    tableRows: rows,
  };

  // Mock reply to capture buffer
  let outBuffer: Buffer = Buffer.alloc(0);
  const mockReply: any = {
    header: () => mockReply,
    send: (buf: Buffer) => {
      outBuffer = buf;
      return mockReply;
    },
  };

  await reportsPdfService.generateReportPdf(meta, mockReply);
  const multipagePath = path.resolve(process.cwd(), 'test_pdfs/multipage_test.pdf');
  fs.writeFileSync(multipagePath, outBuffer);
  console.log(`Saved multipage PDF (${outBuffer.length} bytes) to: ${multipagePath}`);
}

main().catch(console.error);
