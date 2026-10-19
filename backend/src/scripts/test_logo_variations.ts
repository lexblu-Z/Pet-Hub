import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function getOfficialLogoPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(process.cwd(), '../logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(process.cwd(), 'backend/src/assets/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(process.cwd(), 'src/assets/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(__dirname, '../assets/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Logo not found in any candidate path');
}

const logoPath = getOfficialLogoPath();
console.log('Using logo path:', logoPath);

const doc = new PDFDocument({ size: 'A4', margin: 45 });
const outDir = path.resolve(__dirname, '../../test_output_pdfs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.resolve(outDir, 'logo_variations.pdf');
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const PAGE_X = 45;
const PAGE_WIDTH = 505;

// Variation 1: Direct in dark banner with fit [102, 50]
let y = 45;
doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 68, 6).fill('#0f172a');
try {
  doc.image(logoPath, PAGE_X + 8, y + 9, { fit: [102, 50] });
} catch (e) {
  console.error('Error V1:', e);
}
doc.fontSize(8.5).fillColor('#f97316').text('VARIAÇÃO 1', PAGE_X + 120, y + 14);
doc.fontSize(10).fillColor('#ffffff').text('Direto sobre fundo escuro (#0f172a)', PAGE_X + 120, y + 26);
doc.fontSize(8).fillColor('#94a3b8').text('Verifique o contraste de "Pet" (verde-escuro) sobre azul-escuro.', PAGE_X + 120, y + 42);

// Variation 2: White rounded badge card inside dark banner
y += 85;
doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 68, 6).fill('#0f172a');
doc.roundedRect(PAGE_X + 8, y + 6, 104, 56, 4).fill('#ffffff');
try {
  doc.image(logoPath, PAGE_X + 10, y + 8, { fit: [100, 52] });
} catch (e) {
  console.error('Error V2:', e);
}
doc.fontSize(8.5).fillColor('#f97316').text('VARIAÇÃO 2', PAGE_X + 120, y + 14);
doc.fontSize(10).fillColor('#ffffff').text('Com card branco protetor arredondado', PAGE_X + 120, y + 26);
doc.fontSize(8).fillColor('#94a3b8').text('Proporciona contraste nítido oficial, sem ofuscar elementos adjacentes.', PAGE_X + 120, y + 42);

// Variation 3: White badge card with precise padding
y += 85;
doc.roundedRect(PAGE_X, y, PAGE_WIDTH, 68, 6).fill('#0f172a');
doc.roundedRect(PAGE_X + 8, y + 8, 106, 52, 5).fill('#ffffff');
try {
  doc.image(logoPath, PAGE_X + 11, y + 10, { fit: [100, 48] });
} catch (e) {
  console.error('Error V3:', e);
}
doc.fontSize(8.5).fillColor('#f97316').text('VARIAÇÃO 3', PAGE_X + 120, y + 14);
doc.fontSize(10).fillColor('#ffffff').text('Card branco compacto 106x52', PAGE_X + 120, y + 26);

doc.end();

stream.on('finish', () => {
  console.log('PDF write finished successfully to:', outPath);
});
