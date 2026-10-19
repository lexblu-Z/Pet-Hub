import fs from 'fs';
import path from 'path';

/**
 * PetHub Standard PDF Constants
 * A4 dimensions: 595.28 x 841.89 pt
 * Margins: 45 pt
 * Printable Width: 505 pt
 */
export const PDF_PAGE_X = 45;
export const PDF_PAGE_WIDTH = 505;
export const PDF_BOTTOM_LIMIT = 720;
export const PDF_FOOTER_Y = 785;

export const PDF_CELL_PADDING_X = 6;
export const PDF_CELL_PADDING_TOP = 6;
export const PDF_CELL_PADDING_BOTTOM = 6;
export const PDF_MIN_ROW_HEIGHT = 22;

/**
 * Resolves the official PetHub logo safely across production, development,
 * and test environments without hardcoded developer machine paths.
 */
export function getOfficialPdfLogoPath(): string | null {
  const candidates = [
    // 1. Root relative logo_pdf directory (per specification)
    path.resolve(process.cwd(), 'logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(process.cwd(), '../logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    // 2. Packaged backend assets directory
    path.resolve(__dirname, '../assets/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(__dirname, '../../assets/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(process.cwd(), 'backend/src/assets/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(process.cwd(), 'src/assets/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
    path.resolve(process.cwd(), 'pethub-frontend/public/logo_pdf/81e661a1-4ce0-4cea-b415-a84bdf32e9b3.png'),
  ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        return c;
      }
    } catch {
      // ignore access error
    }
  }

  return null;
}

/**
 * Renders the official PetHub logo with high fidelity, original aspect ratio,
 * and a protective white rounded badge container inside dark banners.
 */
export function renderOfficialPdfLogo(doc: any, x = PDF_PAGE_X + 8, y = 51): void {
  const logoPath = getOfficialPdfLogoPath();

  // Draw clean white protective card badge to ensure perfect contrast and no color clashing
  doc.roundedRect(x, y, 104, 56, 4).fill('#ffffff');

  if (logoPath) {
    try {
      doc.image(logoPath, x + 2, y + 2, {
        fit: [100, 52],
        align: 'center',
        valign: 'center',
      });
      return;
    } catch {
      // Fallback below
    }
  }

  // Graceful typographic fallback if image file is unreachable
  doc.fillColor('#059669').fontSize(14).font('Helvetica-Bold').text('Pet', x + 14, y + 20, { continued: true });
  doc.fillColor('#ea580c').text('Hub');
}

/**
 * Renders a compact logo badge for subsequent pages
 */
export function renderCompactPdfLogo(doc: any, x = PDF_PAGE_X + 8, y = 49): void {
  const logoPath = getOfficialPdfLogoPath();

  doc.roundedRect(x, y, 36, 18, 3).fill('#ffffff');

  if (logoPath) {
    try {
      doc.image(logoPath, x + 2, y + 2, {
        fit: [32, 14],
        align: 'center',
        valign: 'center',
      });
      return;
    } catch {
      // Fallback
    }
  }

  doc.fillColor('#ea580c').fontSize(8).font('Helvetica-Bold').text('PetHub', x + 3, y + 5);
}

/**
 * Calculates dynamic row height by checking ALL columns in the row with exact available width.
 * Guarantees that multiline cells and character descenders (g, j, p, q, y, ç) never get cut.
 */
export function calculateRowHeight(
  doc: any,
  columns: Array<{ width: number }>,
  cells: Array<{ text: string; bold?: boolean }>,
  fontSize = 7.5
): number {
  let maxTextHeight = 10;

  for (let c = 0; c < columns.length; c++) {
    const col = columns[c];
    if (!col) continue;

    const cell = cells[c];
    const text = cell?.text || '';
    if (!text) continue;

    const isBold = cell?.bold || false;
    doc.fontSize(fontSize).font(isBold ? 'Helvetica-Bold' : 'Helvetica');

    // EXACT same width as used during doc.text render (column width minus 2x horizontal padding)
    const availableWidth = Math.max(10, col.width - (PDF_CELL_PADDING_X * 2));
    const h = doc.heightOfString(text, { width: availableWidth });

    if (h > maxTextHeight) {
      maxTextHeight = h;
    }
  }

  return Math.max(
    PDF_MIN_ROW_HEIGHT,
    Math.ceil(maxTextHeight + PDF_CELL_PADDING_TOP + PDF_CELL_PADDING_BOTTOM)
  );
}

/**
 * Formats a date in pt-BR timezone America/Sao_Paulo
 */
export function formatPdfDateTimeBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatPdfDateShortBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

export function formatPdfCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}
