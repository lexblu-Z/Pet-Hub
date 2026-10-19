import fs from 'fs';
import path from 'path';

const FRONTEND_SRC = path.resolve(__dirname, '../../../pethub-frontend/src');

// Registered routes in App.tsx (static & prefix patterns)
const registeredStaticRoutes = new Set([
  '/',
  '/welcome',
  '/agendar',
  '/booking',
  '/plans',
  '/planos',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/onboarding',
  '/auth/callback',
  '/auth/select-role',
  '/tutor',
  '/tutor/pets',
  '/tutor/pets/novo',
  '/tutor/appointments',
  '/tutor/agendamentos',
  '/tutor/booking',
  '/tutor/explore',
  '/tutor/explorar',
  '/tutor/shop',
  '/tutor/loja',
  '/tutor/cashback',
  '/tutor/chat',
  '/tutor/favorites',
  '/tutor/favoritos',
  '/tutor/profile',
  '/tutor/perfil',
  '/tutor/enderecos',
  '/tutor/addresses',
  '/tutor/plans',
  '/tutor/notifications',
  '/tutor/compras',
  '/tutor/pedidos',
  '/tutor/minhas-compras',
  '/tutor/meus-pedidos',
  '/tutor/pagamento',
  '/tutor/seguranca',
  '/tutor/preferencias',
  '/tutor/notificacoes-config',
  '/tutor/easter-egg',
  '/estabelecimento',
  '/estabelecimento/perfil',
  '/estabelecimento/servicos',
  '/estabelecimento/produtos',
  '/estabelecimento/pedidos',
  '/estabelecimento/agendamentos',
  '/estabelecimento/funcionarios',
  '/estabelecimento/relatorios',
  '/estabelecimento/mensagens',
  '/estabelecimento/configuracoes',
  '/profissional',
  '/profissional/agenda',
  '/profissional/ordens',
  '/profissional/avaliacoes',
  '/profissional/relatorios',
  '/profissional/prestar-servicos',
  '/profissional/perfil',
  '/admin',
  '/admin/estabelecimentos',
  '/admin/profissionais',
  '/admin/usuarios',
  '/admin/users',
  '/admin/pets',
  '/admin/agendamentos',
  '/admin/moderacao',
  '/admin/financeiro',
  '/admin/notificacoes',
  '/admin/auditoria',
  '/admin/configuracoes',
]);

const registeredDynamicPatterns = [
  /^\/tutor\/pets\/[^/]+$/,
  /^\/tutor\/pets\/[^/]+\/editar$/,
  /^\/tutor\/booking\/[^/]+$/,
  /^\/tutor\/agendar\/[^/]+$/,
  /^\/tutor\/establishment\/[^/]+$/,
  /^\/tutor\/estabelecimentos\/[^/]+$/,
  /^\/estabelecimento\/[^/]+$/,
  /^\/profissional\/[^/]+$/,
  /^\/admin\/[^/]+$/,
];

function isRouteValid(route: string): boolean {
  // Strip query string and hash
  const cleanRoute = route.split('?')[0].split('#')[0];
  if (!cleanRoute || cleanRoute.startsWith('http://') || cleanRoute.startsWith('https://') || cleanRoute.startsWith('mailto:') || cleanRoute.startsWith('tel:')) {
    return true;
  }
  if (registeredStaticRoutes.has(cleanRoute)) return true;
  for (const pat of registeredDynamicPatterns) {
    if (pat.test(cleanRoute)) return true;
  }
  return false;
}

function scanDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = scanDir(FRONTEND_SRC);
const extractedLinks: { file: string; line: number; route: string; source: string }[] = [];

// Regex to capture <Link to="..." / NavLink to="..." / navigate("...") / href="..."
const linkRegex = /to=["']([^"']+)["']/g;
const navRegex = /navigate\(["']([^"']+)["']/g;
const hrefRegex = /href=["']([^"']+)["']/g;

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((lineText, idx) => {
    let match;
    while ((match = linkRegex.exec(lineText)) !== null) {
      extractedLinks.push({ file: path.relative(FRONTEND_SRC, f), line: idx + 1, route: match[1], source: 'to="..."' });
    }
    while ((match = navRegex.exec(lineText)) !== null) {
      extractedLinks.push({ file: path.relative(FRONTEND_SRC, f), line: idx + 1, route: match[1], source: 'navigate("...")' });
    }
    while ((match = hrefRegex.exec(lineText)) !== null) {
      if (match[1].startsWith('/')) {
        extractedLinks.push({ file: path.relative(FRONTEND_SRC, f), line: idx + 1, route: match[1], source: 'href="..."' });
      }
    }
  });
}

console.log(`Total extracted route references: ${extractedLinks.length}`);
const invalidLinks = extractedLinks.filter((l) => !isRouteValid(l.route));

console.log(`\nInvalid / Unmatched routes found: ${invalidLinks.length}`);
for (const inv of invalidLinks) {
  console.log(`❌ [${inv.file}:${inv.line}] (${inv.source}) -> "${inv.route}"`);
}

if (invalidLinks.length === 0) {
  console.log('✅ ALL extracted frontend routes match valid routes registered in App.tsx!');
}
