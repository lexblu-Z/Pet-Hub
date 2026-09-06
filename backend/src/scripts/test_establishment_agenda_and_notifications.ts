import http from 'http';
import { prisma } from '../lib/prisma';

function makeRequest(options: http.RequestOptions, postData?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 500, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function main() {
  console.log('================================================================');
  console.log('🧪 TESTE COMPLETO: AGENDA DO ESTABELECIMENTO E NOTIFICAÇÕES');
  console.log('================================================================');

  const ts = Date.now();
  const tutorEmail = `tutor_agenda_${ts}@pethub.com`;
  const estAEmail = `esta_agenda_${ts}@pethub.com`;
  const estBEmail = `estb_agenda_${ts}@pethub.com`;
  const password = 'Password123!';

  // 1. Cadastrar Tutor
  console.log('\n[1/10] Cadastrando Tutor...');
  const regTutor = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { name: 'Tutor Teste Agenda', email: tutorEmail, password, role: 'TUTOR', phone: '(14) 99111-2222' }
  );
  if (regTutor.status !== 201 && regTutor.status !== 200) {
    throw new Error(`Falha ao registrar tutor: ${JSON.stringify(regTutor.body)}`);
  }
  const tutorToken = regTutor.body.token;
  const tutorId = regTutor.body.user.id;
  console.log(`✅ Tutor criado: ID ${tutorId}`);

  // Cadastrar Pet para o Tutor
  console.log('\n[2/10] Cadastrando Pet...');
  const regPet = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/pets', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tutorToken}` } },
    { name: 'Rex Agenda', species: 'Cachorro', breed: 'Golden Retriever', age: 3, weight: 28 }
  );
  if (regPet.status !== 201 && regPet.status !== 200) {
    throw new Error(`Falha ao criar pet: ${JSON.stringify(regPet.body)}`);
  }
  const petId = regPet.body.id;
  console.log(`✅ Pet cadastrado: ID ${petId} (Rex)`);

  // 2. Cadastrar Estabelecimento A
  console.log('\n[3/10] Cadastrando Estabelecimento A...');
  const regEstA = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'Centro Veterinário Alpha',
      email: estAEmail,
      password,
      role: 'ESTABLISHMENT',
      phone: '(14) 99333-4444',
      businessName: 'Centro Veterinário Alpha',
      city: 'Ourinhos',
      state: 'SP',
    }
  );
  if (regEstA.status !== 201 && regEstA.status !== 200) {
    throw new Error(`Falha ao registrar Estabelecimento A: ${JSON.stringify(regEstA.body)}`);
  }
  const estAId = regEstA.body.user.id;

  // Obter token via login
  const loginEstA = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: estAEmail, password }
  );
  if (loginEstA.status !== 200) {
    throw new Error(`Falha ao logar Estabelecimento A: ${JSON.stringify(loginEstA.body)}`);
  }
  const estAToken = loginEstA.body.token;
  await prisma.establishmentProfile.update({
    where: { userId: estAId },
    data: { status: 'ACTIVE' },
  });
  console.log(`✅ Estabelecimento A criado e autenticado (status ACTIVE): ID ${estAId}`);

  // Criar Serviço no Estabelecimento A
  console.log('\n[4/10] Criando Serviço no Estabelecimento A...');
  const regService = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/establishment/services', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${estAToken}` } },
    { name: 'Banho e Tosa Completa', description: 'Banho premium e tosa higiênica', duration: 60, price: 95.0, category: 'Estética' }
  );
  if (regService.status !== 201 && regService.status !== 200) {
    throw new Error(`Falha ao criar serviço: ${JSON.stringify(regService.body)}`);
  }
  const serviceId = regService.body.id;
  console.log(`✅ Serviço criado: ID ${serviceId} (R$ 95,00)`);

  // Criar Funcionário no Estabelecimento A
  console.log('\n[5/10] Cadastrando Funcionário no Estabelecimento A...');
  const regEmp = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/establishment/employees', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${estAToken}` } },
    { name: 'Dr. Roberto Santos', role: 'Tosador e Banhista Sênior', phone: '(14) 99888-7777', active: true }
  );
  if (regEmp.status !== 201 && regEmp.status !== 200) {
    throw new Error(`Falha ao cadastrar funcionário: ${JSON.stringify(regEmp.body)}`);
  }
  const employeeId = regEmp.body.id;
  console.log(`✅ Funcionário cadastrado: ID ${employeeId} (${regEmp.body.name})`);

  // 3. Criar Agendamentos no Estabelecimento A
  console.log('\n[6/10] Criando agendamentos (um para 2026-09-10 e outro para 2026-09-12)...');
  const apt1Res = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/appointments', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tutorToken}` } },
    {
      petId,
      serviceId,
      establishmentId: estAId,
      date: '2026-09-10T13:00:00.000Z',
    }
  );
  if (apt1Res.status !== 201 && apt1Res.status !== 200) {
    throw new Error(`Falha ao criar agendamento 1: ${JSON.stringify(apt1Res.body)}`);
  }
  const apt1Id = apt1Res.body.id;
  console.log(`✅ Agendamento 1 criado para 2026-09-10 às 13:00 (ID: ${apt1Id})`);

  const apt2Res = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/appointments', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tutorToken}` } },
    {
      petId,
      serviceId,
      establishmentId: estAId,
      date: '2026-09-12T16:30:00.000Z',
    }
  );
  if (apt2Res.status !== 201 && apt2Res.status !== 200) {
    throw new Error(`Falha ao criar agendamento 2: ${JSON.stringify(apt2Res.body)}`);
  }
  const apt2Id = apt2Res.body.id;
  console.log(`✅ Agendamento 2 criado para 2026-09-12 às 16:30 (ID: ${apt2Id})`);

  // 4. Testar Consultas da Agenda do Estabelecimento (Filtros por Data e Intervalo)
  console.log('\n[7/10] Testando filtros temporais da agenda do Estabelecimento A...');
  
  // A) Filtro por dia exato (2026-09-10)
  const day10Apts = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/establishment/appointments?date=2026-09-10', method: 'GET', headers: { Authorization: `Bearer ${estAToken}` } }
  );
  console.log(`-> Agendamentos para 2026-09-10: ${day10Apts.body.length}`);
  if (day10Apts.body.length !== 1 || day10Apts.body[0].id !== apt1Id) {
    throw new Error(`Esperado exatamente 1 agendamento no dia 2026-09-10, recebido: ${JSON.stringify(day10Apts.body)}`);
  }
  if (day10Apts.body[0].time !== '13:00') {
    throw new Error(`Horário nominal incorreto: esperado 13:00, recebido ${day10Apts.body[0].time}`);
  }
  console.log('✅ Filtro de data exata funcionou com sucesso!');

  // B) Filtro por intervalo semanal (2026-09-07 a 2026-09-13)
  const weekApts = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/establishment/appointments?startDate=2026-09-07&endDate=2026-09-13', method: 'GET', headers: { Authorization: `Bearer ${estAToken}` } }
  );
  console.log(`-> Agendamentos na semana (07/09 a 13/09): ${weekApts.body.length}`);
  if (weekApts.body.length < 2) {
    throw new Error(`Esperado pelo menos 2 agendamentos no intervalo semanal, recebido: ${weekApts.body.length}`);
  }
  console.log('✅ Filtro semanal funcionou com sucesso!');

  // C) Atribuir funcionário ao agendamento 1
  console.log('\n[8/10] Testando atribuição de funcionário ao agendamento 1...');
  const assignRes = await makeRequest(
    { hostname: 'localhost', port: 3000, path: `/api/establishment/appointments/${apt1Id}/assign-employee`, method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${estAToken}` } },
    { employeeId }
  );
  if (assignRes.status !== 200 || assignRes.body.employeeId !== employeeId) {
    throw new Error(`Falha ao atribuir funcionário: ${JSON.stringify(assignRes.body)}`);
  }
  console.log(`✅ Funcionário ${employeeId} atribuído ao agendamento 1 com sucesso!`);

  // D) Atualizar status para CONFIRMED pelo Estabelecimento A
  console.log('\n[9/10] Estabelecimento atualiza status para CONFIRMED...');
  const confirmRes = await makeRequest(
    { hostname: 'localhost', port: 3000, path: `/api/establishment/appointments/${apt1Id}/status`, method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${estAToken}` } },
    { status: 'CONFIRMED' }
  );
  if (confirmRes.status !== 200 || confirmRes.body.status !== 'CONFIRMED') {
    throw new Error(`Falha ao confirmar agendamento: ${JSON.stringify(confirmRes.body)}`);
  }
  console.log('✅ Agendamento 1 confirmado pelo estabelecimento!');

  // Verificar se o Tutor recebeu a notificação de confirmação
  const tutorNotifs = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/notifications', method: 'GET', headers: { Authorization: `Bearer ${tutorToken}` } }
  );
  const confirmNotif = tutorNotifs.body.find((n: any) => n.title.includes('confirmado'));
  if (!confirmNotif) {
    throw new Error(`Tutor não recebeu a notificação de confirmação! Notificações: ${JSON.stringify(tutorNotifs.body)}`);
  }
  console.log(`✅ Tutor recebeu notificação real: "${confirmNotif.title} - ${confirmNotif.message}"`);

  // E) Tutor cancela o agendamento 2
  console.log('\nTutor cancela o agendamento 2...');
  const cancelRes = await makeRequest(
    { hostname: 'localhost', port: 3000, path: `/api/appointments/${apt2Id}/status`, method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tutorToken}` } },
    { status: 'CANCELLED' }
  );
  if (cancelRes.status !== 200 || cancelRes.body.status !== 'CANCELLED') {
    throw new Error(`Falha ao cancelar agendamento: ${JSON.stringify(cancelRes.body)}`);
  }
  console.log('✅ Agendamento 2 cancelado pelo tutor!');

  // Verificar se o Estabelecimento A recebeu notificação de cancelamento
  const estANotifs = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/notifications', method: 'GET', headers: { Authorization: `Bearer ${estAToken}` } }
  );
  const cancelNotif = estANotifs.body.find((n: any) => n.title.includes('cancelado'));
  if (!cancelNotif) {
    throw new Error(`Estabelecimento A não recebeu a notificação de cancelamento! Notificações: ${JSON.stringify(estANotifs.body)}`);
  }
  console.log(`✅ Estabelecimento A recebeu notificação real: "${cancelNotif.title} - ${cancelNotif.message}"`);

  // F) Testar marcação de notificação individual como lida
  console.log('\nTestando marcar notificação como lida individualmente...');
  const markReadRes = await makeRequest(
    { hostname: 'localhost', port: 3000, path: `/api/notifications/${cancelNotif.id}/read`, method: 'PATCH', headers: { Authorization: `Bearer ${estAToken}` } }
  );
  if (markReadRes.status !== 200 || !markReadRes.body.read) {
    throw new Error(`Falha ao marcar como lida: ${JSON.stringify(markReadRes.body)}`);
  }
  console.log('✅ Notificação marcada como lida individualmente!');

  // G) Testar marcar todas como lidas
  console.log('\nTestando marcar todas as notificações como lidas...');
  const markAllRes = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/notifications/read-all', method: 'PATCH', headers: { Authorization: `Bearer ${estAToken}` } }
  );
  if (markAllRes.status !== 200) {
    throw new Error(`Falha ao marcar todas como lidas: ${JSON.stringify(markAllRes.body)}`);
  }
  const estANotifsAfter = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/notifications', method: 'GET', headers: { Authorization: `Bearer ${estAToken}` } }
  );
  const unreadCount = estANotifsAfter.body.filter((n: any) => !n.read).length;
  if (unreadCount !== 0) {
    throw new Error(`Ainda restam ${unreadCount} notificações não lidas após mark-all!`);
  }
  console.log('✅ Todas as notificações foram marcadas como lidas com sucesso!');

  // 5. Teste de Isolamento entre Estabelecimentos (Tenant Isolation)
  console.log('\n[10/10] Testando Isolamento Estrito entre Estabelecimentos (Tenant Isolation)...');
  const regEstB = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'PetShop Beta Independente',
      email: estBEmail,
      password,
      role: 'ESTABLISHMENT',
      phone: '(14) 99555-6666',
      businessName: 'PetShop Beta Independente',
      city: 'Ourinhos',
      state: 'SP',
    }
  );
  const estBId = regEstB.body.user.id;
  const loginEstB = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: estBEmail, password }
  );
  if (loginEstB.status !== 200) {
    throw new Error(`Falha ao logar Estabelecimento B: ${JSON.stringify(loginEstB.body)}`);
  }
  const estBToken = loginEstB.body.token;
  await prisma.establishmentProfile.update({
    where: { userId: estBId },
    data: { status: 'ACTIVE' },
  });

  // Estabelecimento B tenta ver notificações
  const estBNotifs = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/notifications', method: 'GET', headers: { Authorization: `Bearer ${estBToken}` } }
  );
  if (estBNotifs.body.length !== 0) {
    throw new Error(`VAZAMENTO DE DADOS! Estabelecimento B recebeu notificações do Estabelecimento A: ${JSON.stringify(estBNotifs.body)}`);
  }
  console.log('✅ Estabelecimento B possui 0 notificações (sem vazamento de dados de A)!');

  // Estabelecimento B tenta ver agendamentos de A
  const estBApts = await makeRequest(
    { hostname: 'localhost', port: 3000, path: '/api/establishment/appointments', method: 'GET', headers: { Authorization: `Bearer ${estBToken}` } }
  );
  if (estBApts.body.length !== 0) {
    throw new Error(`VAZAMENTO DE DADOS! Estabelecimento B recebeu agendamentos do Estabelecimento A: ${JSON.stringify(estBApts.body)}`);
  }
  console.log('✅ Estabelecimento B possui 0 agendamentos (isolamento total de agendamentos)!');

  console.log('\n================================================================');
  console.log('🎉 TODOS OS 10 TESTES DE AUDITORIA FORAM APROVADOS COM SUCESSO!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
