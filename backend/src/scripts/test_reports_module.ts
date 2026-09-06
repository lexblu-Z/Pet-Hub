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

async function runTests() {
  console.log('🐾 --- INICIANDO BATERIA DE TESTES DO MÓDULO DE RELATÓRIOS --- 🐾\n');

  // 1. Localizar ou preparar usuários de teste
  const establishments = await prisma.user.findMany({
    where: { role: Role.ESTABLISHMENT },
    take: 2,
    include: { establishmentProfile: true },
  });

  const professionals = await prisma.user.findMany({
    where: { role: Role.PROFESSIONAL },
    take: 2,
    include: { professionalProfile: true },
  });

  if (establishments.length < 1 || professionals.length < 1) {
    console.error('❌ Necessário pelo menos 1 estabelecimento e 1 profissional cadastrados.');
    process.exit(1);
  }

  const estA = establishments[0];
  const estB = establishments[1] || null;
  const profA = professionals[0];
  const profB = professionals[1] || null;

  const tokenEstA = makeToken(estA);
  const tokenProfA = makeToken(profA);

  console.log(`✅ Estabelecimento A: ${estA.name} (${estA.id})`);
  if (estB) console.log(`✅ Estabelecimento B: ${estB.name} (${estB.id})`);
  console.log(`✅ Profissional A: ${profA.name} (${profA.id})`);
  if (profB) console.log(`✅ Profissional B: ${profB.name} (${profB.id})`);

  let passed = 0;
  let failed = 0;

  async function assertReq(name: string, fn: () => Promise<boolean>) {
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

  // TESTE 1: Bloqueio não autenticado
  await assertReq('1. Acesso sem autenticação retorna 401', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/services`);
    return res.status === 401;
  });

  // TESTE 2: Profissional tentando acessar rotas de Estabelecimento
  await assertReq('2. Profissional tentando acessar /establishment/services recebe 403', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/services`, {
      headers: { Authorization: `Bearer ${tokenProfA}` },
    });
    return res.status === 403;
  });

  // TESTE 3: Estabelecimento tentando acessar rotas de Profissional
  await assertReq('3. Estabelecimento tentando acessar /professional/services recebe 403', async () => {
    const res = await fetch(`${API_BASE}/reports/professional/services`, {
      headers: { Authorization: `Bearer ${tokenEstA}` },
    });
    return res.status === 403;
  });

  // TESTE 4: Estabelecimento A — Serviços
  await assertReq('4. Estabelecimento A consulta seus serviços com sucesso (200)', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/services`, {
      headers: { Authorization: `Bearer ${tokenEstA}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return (
      data.period &&
      data.summary &&
      typeof data.summary.total === 'number' &&
      Array.isArray(data.productivity) &&
      Array.isArray(data.servicesRanking) &&
      Array.isArray(data.appointments)
    );
  });

  // TESTE 5: Estabelecimento A — Financeiro
  await assertReq('5. Estabelecimento A consulta relatório financeiro com sucesso (200)', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/financial`, {
      headers: { Authorization: `Bearer ${tokenEstA}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return (
      data.summary &&
      typeof data.summary.totalGrossRevenue === 'number' &&
      typeof data.summary.grossRevenueServices === 'number' &&
      typeof data.summary.grossRevenueProducts === 'number' &&
      data.paymentMethodBreakdown &&
      Array.isArray(data.cashFlow) &&
      Array.isArray(data.transactions)
    );
  });

  // TESTE 6: Estabelecimento A — Clientes e Pets
  await assertReq('6. Estabelecimento A consulta clientes e pets com sucesso (200)', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/customers`, {
      headers: { Authorization: `Bearer ${tokenEstA}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return (
      data.summary &&
      typeof data.summary.totalUniqueCustomers === 'number' &&
      typeof data.summary.totalUniquePets === 'number' &&
      Array.isArray(data.customers) &&
      Array.isArray(data.pets)
    );
  });

  // TESTE 7: Estabelecimento A — Estoque
  await assertReq('7. Estabelecimento A consulta relatório de estoque com sucesso (200)', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/inventory`, {
      headers: { Authorization: `Bearer ${tokenEstA}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return (
      data.summary &&
      typeof data.summary.totalProducts === 'number' &&
      typeof data.summary.totalStockUnits === 'number' &&
      typeof data.summary.totalStockValue === 'number' &&
      Array.isArray(data.products)
    );
  });

  // TESTE 8: Estabelecimento A — Exportação CSV com BOM UTF-8 e delimitador ';'
  await assertReq('8. Estabelecimento A exporta CSV com formato e delimitador corretos', async () => {
    const res = await fetch(`${API_BASE}/reports/establishment/export?type=services`, {
      headers: { Authorization: `Bearer ${tokenEstA}` },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || '';
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString('utf-8');
    const hasSemicolon = text.includes(';');
    const hasHeaders = text.includes('Data e Hora') && text.includes('Serviço');
    return res.status === 200 && contentType.includes('text/csv') && hasBom && hasSemicolon && hasHeaders;
  });

  // TESTE 9: Profissional A — Serviços
  await assertReq('9. Profissional A consulta seus serviços com sucesso (200)', async () => {
    const res = await fetch(`${API_BASE}/reports/professional/services`, {
      headers: { Authorization: `Bearer ${tokenProfA}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return (
      data.period &&
      data.summary &&
      typeof data.summary.total === 'number' &&
      Array.isArray(data.servicesByCategory) &&
      Array.isArray(data.appointments)
    );
  });

  // TESTE 10: Profissional A — Financeiro (apenas serviços atendidos)
  await assertReq('10. Profissional A consulta financeiro de serviços com aviso de repasse (200)', async () => {
    const res = await fetch(`${API_BASE}/reports/professional/financial`, {
      headers: { Authorization: `Bearer ${tokenProfA}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return (
      data.summary &&
      typeof data.summary.grossRevenue === 'number' &&
      typeof data.summary.commissionNotice === 'string' &&
      Array.isArray(data.transactions)
    );
  });

  // TESTE 11: Profissional A — Clientes e Pets (isolamento do profissional)
  await assertReq('11. Profissional A consulta clientes atendidos por ele (200)', async () => {
    const res = await fetch(`${API_BASE}/reports/professional/customers`, {
      headers: { Authorization: `Bearer ${tokenProfA}` },
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return (
      data.summary &&
      typeof data.summary.totalUniqueCustomers === 'number' &&
      Array.isArray(data.customers) &&
      Array.isArray(data.pets)
    );
  });

  // TESTE 12: Profissional A — Exportação CSV
  await assertReq('12. Profissional A exporta CSV de serviços com sucesso', async () => {
    const res = await fetch(`${API_BASE}/reports/professional/export?type=services`, {
      headers: { Authorization: `Bearer ${tokenProfA}` },
    });
    if (res.status !== 200) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString('utf-8');
    const hasSemicolon = text.includes(';');
    return hasBom && hasSemicolon;
  });

  // TESTE 13: Isolamento estrito entre Profissional A e Profissional B
  if (profB) {
    await assertReq('13. Isolamento: Profissional A não visualiza atendimentos de Profissional B', async () => {
      // Criar agendamento para profB se não existir
      const tutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } });
      const serviceB = await prisma.service.findFirst({ where: { professionalId: profB.id } }) ||
                       await prisma.service.findFirst();
      const pet = await prisma.pet.findFirst();

      if (tutor && serviceB && pet) {
        const aptB = await prisma.appointment.create({
          data: {
            tutorId: tutor.id,
            petId: pet.id,
            serviceId: serviceB.id,
            establishmentId: estA.id,
            professionalId: profB.id,
            date: new Date(),
            status: AppointmentStatus.CONFIRMED,
          },
        });

        // Consultar como Profissional A
        const resA = await fetch(`${API_BASE}/reports/professional/services`, {
          headers: { Authorization: `Bearer ${tokenProfA}` },
        });
        const dataA = await resA.json();
        const foundInA = dataA.appointments.some((a: any) => a.id === aptB.id);

        // Limpar registro de teste
        await prisma.appointment.delete({ where: { id: aptB.id } });

        return !foundInA;
      }
      return true;
    });
  }

  // TESTE 14: Isolamento estrito entre Estabelecimento A e Estabelecimento B
  if (estB) {
    const tokenEstB = makeToken(estB);
    await assertReq('14. Isolamento: Estabelecimento A não visualiza estoque de Estabelecimento B', async () => {
      // Criar produto de teste em estB
      const prodB = await prisma.product.create({
        data: {
          name: 'Produto Exclusivo EstB QA',
          price: 99.9,
          stock: 10,
          establishmentId: estB.id,
        },
      });

      // Consultar como Estabelecimento A
      const resA = await fetch(`${API_BASE}/reports/establishment/inventory`, {
        headers: { Authorization: `Bearer ${tokenEstA}` },
      });
      const dataA = await resA.json();
      const foundInA = dataA.products.some((p: any) => p.id === prodB.id);

      // Limpar produto de teste
      await prisma.product.delete({ where: { id: prodB.id } });

      return !foundInA;
    });
  }

  console.log(`\n========================================`);
  console.log(`RESULTADO DOS TESTES:`);
  console.log(`Total de testes: ${passed + failed}`);
  console.log(`Passou: ${passed}`);
  console.log(`Falhou: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
