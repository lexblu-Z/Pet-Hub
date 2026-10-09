import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function testAdminApi() {
  console.log('====================================================');
  console.log('🔐 TESTE FORENSE DE API DO ADMIN PÓS-LIMPEZA');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  function assert(cond: boolean, desc: string, detail?: string) {
    if (cond) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc} - ${detail || 'Erro na asserção'}`);
      failed++;
    }
  }

  // 1. Login do Admin
  console.log('--- 1. Login do Administrador ---');
  let token = '';
  try {
    const resLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin',
      password: 'admin123',
    });
    assert(resLogin.status === 200, 'Login do Admin retornou HTTP 200');
    assert(resLogin.data.token !== undefined, 'Token JWT retornado');
    assert(resLogin.data.user?.role === 'ADMIN', 'Role do usuário autenticado é ADMIN');
    assert(resLogin.data.user?.name === 'Administrador do Sistema', 'Nome do Admin confere');
    token = resLogin.data.token;
  } catch (err: any) {
    assert(false, 'Login do Admin falhou', err.response?.data?.error || err.message);
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Dashboard do Admin
  console.log('\n--- 2. Consulta ao Dashboard do Admin (/api/admin/dashboard) ---');
  try {
    const resDash = await axios.get(`${API_BASE}/admin/dashboard`, { headers });
    assert(resDash.status === 200, 'Dashboard do Admin respondeu HTTP 200');
    const data = resDash.data;
    assert(data.users === 1, `Usuários no dashboard: ${data.users} (Esperado: 1)`);
    assert(data.pets === 0, `Pets no dashboard: ${data.pets} (Esperado: 0)`);
    assert(data.activeEstablishments === 0, `Estabelecimentos ativos no dashboard: ${data.activeEstablishments} (Esperado: 0)`);
    assert(data.pendingEstablishments === 0, `Estabelecimentos pendentes no dashboard: ${data.pendingEstablishments} (Esperado: 0)`);
    assert(data.professionals === 0, `Profissionais no dashboard: ${data.professionals} (Esperado: 0)`);
    assert(data.appointments === 0, `Agendamentos no dashboard: ${data.appointments} (Esperado: 0)`);
    assert(data.revenue === 0, `Receita no dashboard: R$ ${data.revenue} (Esperado: 0)`);
    assert(data.pendingReports === 0, `Denúncias pendentes no dashboard: ${data.pendingReports} (Esperado: 0)`);
    assert(Array.isArray(data.recentAppointments) && data.recentAppointments.length === 0, 'Lista de agendamentos recentes vazia');
  } catch (err: any) {
    assert(false, 'Consulta ao Dashboard falhou', err.response?.data?.error || err.message);
  }

  // 3. Módulo Financeiro do Admin
  console.log('\n--- 3. Módulo Financeiro do Admin (/api/admin/finance/overview) ---');
  try {
    const resFin = await axios.get(`${API_BASE}/admin/finance/overview`, { headers });
    assert(resFin.status === 200, 'Financeiro do Admin respondeu HTTP 200');
    const fin = resFin.data;
    assert(fin.kpis?.grossRevenue === 0, `Receita bruta financeira: R$ ${fin.kpis?.grossRevenue} (Esperado: 0)`);
    assert(fin.kpis?.netRevenue === 0, `Receita líquida financeira: R$ ${fin.kpis?.netRevenue} (Esperado: 0)`);
    assert(fin.kpis?.completedCount === 0, `Transações concluídas: ${fin.kpis?.completedCount} (Esperado: 0)`);
    assert(fin.kpis?.cancelledAmount === 0, `Estornos / Cancelamentos: R$ ${fin.kpis?.cancelledAmount} (Esperado: 0)`);
    assert(fin.totalTransactions === 0, `Total de transações no extrato: ${fin.totalTransactions} (Esperado: 0)`);
  } catch (err: any) {
    assert(false, 'Consulta ao Financeiro falhou', err.response?.data?.error || err.message);
  }

  // 4. Moderação do Admin
  console.log('\n--- 4. Módulo de Moderação do Admin (/api/admin/reports) ---');
  try {
    const resMod = await axios.get(`${API_BASE}/admin/reports`, { headers });
    assert(resMod.status === 200, 'Moderação do Admin respondeu HTTP 200');
    assert(Array.isArray(resMod.data.reports) && resMod.data.reports.length === 0, 'Lista de denúncias de moderação vazia');
    assert(resMod.data.total === 0, `Total de denúncias: ${resMod.data.total} (Esperado: 0)`);
  } catch (err: any) {
    assert(false, 'Consulta à Moderação falhou', err.response?.data?.error || err.message);
  }

  // 5. Pets no Admin
  console.log('\n--- 5. Módulo de Pets do Admin (/api/admin/pets) ---');
  try {
    const resPets = await axios.get(`${API_BASE}/admin/pets`, { headers });
    assert(resPets.status === 200, 'Pets do Admin respondeu HTTP 200');
    assert(Array.isArray(resPets.data.pets) && resPets.data.pets.length === 0, 'Lista de pets vazia');
    assert(resPets.data.total === 0, `Total de pets cadastrados: ${resPets.data.total} (Esperado: 0)`);
  } catch (err: any) {
    assert(false, 'Consulta aos Pets falhou', err.response?.data?.error || err.message);
  }

  console.log('\n====================================================');
  console.log(`🏁 RESULTADO DO TESTE DE API: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

testAdminApi().catch((err) => {
  console.error('💥 Erro fatal no teste de API:', err);
  process.exit(1);
});
