import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Role, AppointmentStatus, OrderStatus } from '@prisma/client';

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-fallback';

function base64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeToken(user: { id: string; email: string; role: Role }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

async function runEdgeCaseTests() {
  console.log('🔬 --- TESTES DE CASOS DE BORDA E FILTROS DO MÓDULO DE RELATÓRIOS --- 🔬\n');

  const establishment = await prisma.user.findFirst({ where: { role: Role.ESTABLISHMENT } });
  const professional = await prisma.user.findFirst({ where: { role: Role.PROFESSIONAL } });

  if (!establishment || !professional) {
    console.error('Usuários não encontrados');
    process.exit(1);
  }

  const tokenEst = makeToken(establishment);
  const tokenProf = makeToken(professional);

  let passed = 0;
  let failed = 0;

  async function assertCase(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  [PASS] ${name}`);
        passed++;
      } else {
        console.error(`  [FAIL] ${name}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  [ERROR] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Filtro com período no passado distante (deve retornar vazio sem erro)
  await assertCase('1. Filtro no ano 2020 retorna zero registros com sucesso', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/services?startDate=2020-01-01&endDate=2020-01-31`, {
      headers: { Authorization: `Bearer ${tokenEst}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return data.summary.total === 0 && data.appointments.length === 0;
  });

  // 2. Filtro de status específico (COMPLETED)
  await assertCase('2. Filtro status=COMPLETED retorna apenas agendamentos concluídos', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/services?status=COMPLETED`, {
      headers: { Authorization: `Bearer ${tokenEst}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return data.appointments.every((a: any) => a.status === 'COMPLETED');
  });

  // 3. Filtro de status específico (CANCELLED)
  await assertCase('3. Filtro status=CANCELLED retorna apenas agendamentos cancelados', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/services?status=CANCELLED`, {
      headers: { Authorization: `Bearer ${tokenEst}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return data.appointments.every((a: any) => a.status === 'CANCELLED');
  });

  // 4. Exportação CSV de Financeiro do Estabelecimento
  await assertCase('4. Exportação CSV: Financeiro do Estabelecimento', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/export?type=financial`, {
      headers: { Authorization: `Bearer ${tokenEst}` },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString('utf-8');
    return res.status === 200 && hasBom && text.includes('Tipo') && text.includes('Valor Bruto');
  });

  // 5. Exportação CSV de Estoque do Estabelecimento
  await assertCase('5. Exportação CSV: Estoque do Estabelecimento', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/export?type=inventory`, {
      headers: { Authorization: `Bearer ${tokenEst}` },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString('utf-8');
    return res.status === 200 && hasBom && text.includes('Produto') && text.includes('Estoque Atual');
  });

  // 6. Exportação CSV de Clientes do Estabelecimento
  await assertCase('6. Exportação CSV: Clientes do Estabelecimento', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/export?type=customers`, {
      headers: { Authorization: `Bearer ${tokenEst}` },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString('utf-8');
    return res.status === 200 && hasBom && text.includes('Cliente / Tutor') && text.includes('Pets Atendidos');
  });

  // 7. Exportação CSV de Financeiro do Profissional
  await assertCase('7. Exportação CSV: Financeiro do Profissional', async () => {
    const res = await fetch(`${API_BASE}/reports/professional/export?type=financial`, {
      headers: { Authorization: `Bearer ${tokenProf}` },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString('utf-8');
    return res.status === 200 && hasBom && text.includes('ID Agendamento') && text.includes('Valor Bruto do Serviço');
  });

  // 8. Exportação CSV de Clientes do Profissional
  await assertCase('8. Exportação CSV: Clientes do Profissional', async () => {
    const res = await fetch(`${API_BASE}/reports/professional/export?type=customers`, {
      headers: { Authorization: `Bearer ${tokenProf}` },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString('utf-8');
    return res.status === 200 && hasBom && text.includes('Cliente / Tutor') && text.includes('Pets Atendidos');
  });

  // 9. Filtro de estoque baixo (lowStockOnly=true)
  await assertCase('9. Filtro lowStockOnly=true retorna apenas produtos com estoque <= 5', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/inventory?lowStockOnly=true`, {
      headers: { Authorization: `Bearer ${tokenEst}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return data.products.every((p: any) => p.stock <= 5);
  });

  // 10. Bloqueio de Tutor ao módulo de relatórios
  await assertCase('10. Tutor tentando acessar relatórios de estabelecimento é bloqueado com 403', async () => {
    const tutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } });
    if (!tutor) return true;
    const tokenTutor = makeToken(tutor);
    const res = await fetch(`${API_BASE}/reports/establishment/services`, {
      headers: { Authorization: `Bearer ${tokenTutor}` },
    });
    return res.status === 403;
  });

  // 11. Bloqueio de Tutor ao módulo de profissional
  await assertCase('11. Tutor tentando acessar relatórios de profissional é bloqueado com 403', async () => {
    const tutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } });
    if (!tutor) return true;
    const tokenTutor = makeToken(tutor);
    const res = await fetch(`${API_BASE}/reports/professional/services`, {
      headers: { Authorization: `Bearer ${tokenTutor}` },
    });
    return res.status === 403;
  });

  console.log(`\n========================================`);
  console.log(`RESULTADO DOS CASOS DE BORDA:`);
  console.log(`Total: ${passed + failed}`);
  console.log(`Passou: ${passed}`);
  console.log(`Falhou: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runEdgeCaseTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
