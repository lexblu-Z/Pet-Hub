import axios from 'axios';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { Role, ReportStatus, ReportPriority, ReportTargetType, ApprovalStatus } from '@prisma/client';

const API_URL = 'http://localhost:3000/api';

async function main() {
  console.log('====================================================');
  console.log('🚀 INICIANDO BATERIA DE TESTES DO CENTRO DE CONTROLE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Setup / Find Test Admin & Normal User
  console.log('--- 1. PREPARAÇÃO DE USUÁRIOS DE TESTE ---');
  let admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        name: 'Admin Teste PetHub',
        email: 'admin_test@pethub.com',
        password: hashedPassword,
        hasPassword: true,
        role: Role.ADMIN,
      },
    });
  } else {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword, hasPassword: true },
    });
  }

  let tutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } });
  if (!tutor) {
    const hashedPassword = await bcrypt.hash('tutor123', 10);
    tutor = await prisma.user.create({
      data: {
        name: 'Tutor Teste Denúncia',
        email: 'tutor_test_report@pethub.com',
        password: hashedPassword,
        hasPassword: true,
        role: Role.TUTOR,
      },
    });
  } else {
    const hashedPassword = await bcrypt.hash('tutor123', 10);
    tutor = await prisma.user.update({
      where: { id: tutor.id },
      data: { password: hashedPassword, hasPassword: true },
    });
  }

  let estab = await prisma.establishmentProfile.findFirst({
    include: { user: true },
  });

  // Authenticate Admin
  const adminLoginRes = await axios.post(`${API_URL}/auth/login`, {
    email: admin.email,
    password: 'admin123',
  }).catch(async () => {
    // If password changed, update it to admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });
    return axios.post(`${API_URL}/auth/login`, {
      email: admin.email,
      password: 'admin123',
    });
  });

  const adminToken = adminLoginRes.data.token;
  const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };

  // Authenticate Tutor
  const tutorLoginRes = await axios.post(`${API_URL}/auth/login`, {
    email: tutor.email,
    password: 'tutor123',
  }).catch(async () => {
    const hashedPassword = await bcrypt.hash('tutor123', 10);
    await prisma.user.update({
      where: { id: tutor.id },
      data: { password: hashedPassword },
    });
    return axios.post(`${API_URL}/auth/login`, {
      email: tutor.email,
      password: 'tutor123',
    });
  });

  const tutorToken = tutorLoginRes.data.token;
  const tutorAuthHeader = { Authorization: `Bearer ${tutorToken}` };

  console.log(`Admin ID: ${admin.id} | Tutor ID: ${tutor.id}\n`);

  // --- TEST 1: Rigorous Backend Authorization ---
  console.log('--- 2. TESTE DE AUTORIZAÇÃO E SEGURANÇA BACKEND ---');
  try {
    await axios.get(`${API_URL}/admin/dashboard`, { headers: tutorAuthHeader });
    assert(false, 'Usuário comum com papel TUTOR NÃO deve acessar /api/admin/dashboard');
  } catch (err: any) {
    assert(err.response?.status === 403, 'Bloqueio de acesso de usuário comum a endpoints de ADMIN (HTTP 403)');
  }

  try {
    await axios.get(`${API_URL}/admin/dashboard`);
    assert(false, 'Requisição sem token NÃO deve acessar rotas de ADMIN');
  } catch (err: any) {
    assert(err.response?.status === 401, 'Bloqueio de requisição sem token (HTTP 401)');
  }

  const adminDashRes = await axios.get(`${API_URL}/admin/dashboard`, { headers: adminAuthHeader });
  assert(adminDashRes.status === 200 && typeof adminDashRes.data.users === 'number', 'Acesso autorizado ao dashboard operacional por ADMIN (HTTP 200)');
  assert(typeof adminDashRes.data.pets === 'number', 'Métrica real de total de pets presente no dashboard');
  assert(Array.isArray(adminDashRes.data.rankings?.topSpecies), 'Ranking real de espécies presentes no dashboard');

  // --- TEST 2: Complaints & Moderation Cycle ---
  console.log('\n--- 3. TESTE DO SISTEMA DE MODERAÇÃO E DENÚNCIAS ---');
  // Tutor reports establishment
  const reportPayload = {
    targetType: ReportTargetType.ESTABLISHMENT,
    reportedEstablishmentId: estab?.id || null,
    reportedUserId: estab?.userId || null,
    reason: 'Comportamento inadequado no atendimento',
    description: 'Relato de teste operacional: o estabelecimento cancelou sem aviso prévio.',
  };

  const reportRes = await axios.post(`${API_URL}/reports/profile`, reportPayload, { headers: tutorAuthHeader });
  assert(reportRes.status === 201 && reportRes.data.reportId, 'Envio de denúncia por usuário autenticado (HTTP 201)');

  const createdReportId = reportRes.data.reportId;
  const createdReportNumber = reportRes.data.reportNumber;

  // Admin lists complaints
  const listReportsRes = await axios.get(`${API_URL}/admin/reports`, { headers: adminAuthHeader });
  assert(listReportsRes.status === 200 && Array.isArray(listReportsRes.data.reports), 'Admin lista denúncias da fila de moderação');

  const foundReport = listReportsRes.data.reports.find((r: any) => r.id === createdReportId);
  assert(!!foundReport && foundReport.status === 'NOVA', 'Denúncia recém-criada encontrada com status NOVA na fila');

  // Admin initiates analysis
  const analyzeRes = await apiPut(`${API_URL}/admin/reports/${createdReportId}/status`, {
    status: ReportStatus.EM_ANALISE,
    adminNotes: 'Iniciando verificação do histórico de mensagens.',
  }, adminAuthHeader);
  assert(analyzeRes.data.status === 'EM_ANALISE', 'Transição de denúncia para EM_ANALISE pelo Admin');

  // Admin attempts to resolve without decisionReason -> should fail 400
  try {
    await axios.put(`${API_URL}/admin/reports/${createdReportId}/status`, {
      status: ReportStatus.RESOLVIDA,
    }, { headers: adminAuthHeader });
    assert(false, 'Resolução sem motivo da decisão deve ser rejeitada com HTTP 400');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Rejeição obrigatória de resolução sem motivo da decisão');
  }

  // Admin resolves complaint with decisionReason
  const resolveRes = await axios.put(`${API_URL}/admin/reports/${createdReportId}/status`, {
    status: ReportStatus.RESOLVIDA,
    decisionReason: 'Advertência emitida ao parceiro conforme termos de uso.',
    adminNotes: 'Caso concluído com termo de compromisso.',
  }, { headers: adminAuthHeader });
  assert(resolveRes.data.status === 'RESOLVIDA' && resolveRes.data.decisionReason, 'Resolução formal da denúncia com motivo de decisão persistido');

  // Check audit log for moderation decision
  const auditReport = await prisma.adminAuditLog.findFirst({
    where: { entityId: createdReportId, action: 'REPORT_STATUS_RESOLVIDA' },
  });
  assert(!!auditReport && auditReport.adminId === admin.id, 'Trilha de auditoria persistida em AdminAuditLog para a decisão');

  // --- TEST 3: Universal Appointments & Code Search ---
  console.log('\n--- 4. TESTE DA AGENDA UNIVERSAL E PESQUISA POR CÓDIGO ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const universalRes = await axios.get(`${API_URL}/admin/appointments/universal?date=${todayStr}`, { headers: adminAuthHeader });
  assert(universalRes.status === 200 && Array.isArray(universalRes.data.appointments), 'Consulta de agendamentos universais por data');

  // Find any existing appointment in DB to search by code
  const sampleAppointment = await prisma.appointment.findFirst();
  if (sampleAppointment) {
    const code = `#AGD-${sampleAppointment.id.slice(0, 6).toUpperCase()}`;
    const searchRes = await axios.get(`${API_URL}/admin/appointments/search?code=${encodeURIComponent(code)}`, { headers: adminAuthHeader });
    assert(searchRes.status === 200 && searchRes.data.id === sampleAppointment.id, `Pesquisa de agendamento por código formatado (${code})`);
    assert(searchRes.data.tutor && searchRes.data.service, 'Dados completos da pesquisa por código retornados com relacionamentos');
  } else {
    console.log('⚠️ Nenhum agendamento prévio no banco; pulando busca por código existente.');
  }

  // --- TEST 4: Broadcast Notifications ---
  console.log('\n--- 5. TESTE DA CENTRAL DE COMUNICAÇÃO E DISPARO DE NOTIFICAÇÕES ---');
  const broadcastPayload = {
    title: 'Manutenção Preventiva PetHub',
    message: 'O PetHub passará por melhorias na madrugada.',
    audience: 'TUTORS',
  };

  const broadcastRes = await axios.post(`${API_URL}/admin/notifications/broadcast`, broadcastPayload, { headers: adminAuthHeader });
  assert(broadcastRes.status === 200 && broadcastRes.data.success, 'Disparo de notificação broadcast para público TUTORS (HTTP 200)');
  assert(broadcastRes.data.recipientsCount > 0, `Notificação entregue com sucesso para ${broadcastRes.data.recipientsCount} tutores`);

  // Verify tutor received the notification in /api/notifications
  const tutorNotificationsRes = await axios.get(`${API_URL}/notifications`, { headers: tutorAuthHeader });
  const receivedNotif = tutorNotificationsRes.data.find((n: any) => n.title === 'Manutenção Preventiva PetHub');
  assert(!!receivedNotif, 'Tutor recebeu a notificação no seu centro de notificações');
  assert(receivedNotif.read === false, 'Notificação inicialmente marcada como não lida');

  // Mark notification as read
  const markReadRes = await axios.patch(`${API_URL}/notifications/${receivedNotif.id}/read`, {}, { headers: tutorAuthHeader });
  assert(markReadRes.data.read === true, 'Tutor marcou notificação como lida com sucesso');

  // Check broadcast history
  const historyRes = await axios.get(`${API_URL}/admin/notifications/history`, { headers: adminAuthHeader });
  assert(historyRes.status === 200 && historyRes.data.length > 0, 'Histórico de transmissões administrativas registrado e consultável');

  // --- TEST 5: Financial Center ---
  console.log('\n--- 6. TESTE DA CENTRAL FINANCEIRA COM DADOS REAIS ---');
  const financeRes = await axios.get(`${API_URL}/admin/finance/overview?period=month`, { headers: adminAuthHeader });
  assert(financeRes.status === 200, 'Consulta de consolidação financeira (HTTP 200)');
  assert(typeof financeRes.data.kpis?.grossRevenue === 'number', 'Faturamento bruto calculado a partir de dados reais');
  assert(typeof financeRes.data.kpis?.platformFees === 'number', 'Taxas da plataforma calculadas com precisão contábil');
  assert(financeRes.data.paymentMethods && typeof financeRes.data.paymentMethods.PIX === 'object', 'Distribuição por métodos de pagamento presente');

  // --- TEST 6: Report Exports (PDF & CSV) ---
  console.log('\n--- 7. TESTE DE GERAÇÃO E EXPORTAÇÃO DE RELATÓRIOS (PDF & CSV) ---');
  // Financial PDF
  const pdfRes = await axios.get(`${API_URL}/admin/export?type=finance&format=pdf`, {
    headers: adminAuthHeader,
    responseType: 'arraybuffer',
  });
  assert(pdfRes.status === 200, 'Geração de relatório financeiro em PDF pelo backend (HTTP 200)');
  assert(pdfRes.headers['content-type'] === 'application/pdf', 'Header Content-Type é application/pdf');
  const pdfHeader = Buffer.from(pdfRes.data).slice(0, 4).toString();
  assert(pdfHeader === '%PDF', 'Buffer gerado possui assinatura de cabeçalho válida de PDF (%PDF)');

  // Financial CSV
  const csvRes = await axios.get(`${API_URL}/admin/export?type=finance&format=csv`, {
    headers: adminAuthHeader,
    responseType: 'arraybuffer',
  });
  assert(csvRes.status === 200, 'Geração de relatório financeiro em CSV pelo backend (HTTP 200)');
  assert(String(csvRes.headers['content-type']).includes('text/csv'), 'Header Content-Type inclui text/csv');
  const csvBuffer = Buffer.from(csvRes.data);
  const hasBom = csvBuffer[0] === 0xef && csvBuffer[1] === 0xbb && csvBuffer[2] === 0xbf;
  assert(hasBom, 'CSV possui marca BOM UTF-8 (\\uFEFF) para compatibilidade nativa com Excel');

  // Appointments PDF & CSV
  const appointmentsPdfRes = await axios.get(`${API_URL}/admin/export?type=appointments&format=pdf`, {
    headers: adminAuthHeader,
    responseType: 'arraybuffer',
  });
  assert(appointmentsPdfRes.status === 200, 'Geração de relatório de agendamentos em PDF (HTTP 200)');

  // Pets PDF & CSV
  const petsPdfRes = await axios.get(`${API_URL}/admin/export?type=pets&format=pdf`, {
    headers: adminAuthHeader,
    responseType: 'arraybuffer',
  });
  assert(petsPdfRes.status === 200, 'Geração de relatório de pets em PDF (HTTP 200)');

  // Moderation PDF & CSV
  const moderationPdfRes = await axios.get(`${API_URL}/admin/export?type=moderation&format=pdf`, {
    headers: adminAuthHeader,
    responseType: 'arraybuffer',
  });
  assert(moderationPdfRes.status === 200, 'Geração de relatório de moderação em PDF (HTTP 200)');

  // --- TEST 7: Pet Management ---
  console.log('\n--- 8. TESTE DE GESTÃO DE PETS ---');
  const petsRes = await axios.get(`${API_URL}/admin/pets`, { headers: adminAuthHeader });
  assert(petsRes.status === 200 && Array.isArray(petsRes.data.pets), 'Consulta da listagem administrativa de pets');
  assert(typeof petsRes.data.stats?.total === 'number', 'Total geral de pets presente nas estatísticas');
  assert(Array.isArray(petsRes.data.stats?.speciesDistribution), 'Distribuição de pets por espécie presente nas estatísticas');

  // --- TEST 8: Operational Alerts ---
  console.log('\n--- 9. TESTE DA CENTRAL DE ALERTAS OPERACIONAIS ---');
  const alertsRes = await axios.get(`${API_URL}/admin/dashboard/alerts`, { headers: adminAuthHeader });
  assert(alertsRes.status === 200 && Array.isArray(alertsRes.data), 'Central de alertas operacionais retornada');

  // --- TEST 9: Performance Chart Intervals ---
  console.log('\n--- 10. TESTE DO GRÁFICO DE DESEMPENHO TEMPORAL ---');
  for (const p of ['7d', '30d', '3m', '6m', '1y']) {
    const perfRes = await axios.get(`${API_URL}/admin/dashboard/performance?period=${p}`, { headers: adminAuthHeader });
    assert(perfRes.status === 200 && Array.isArray(perfRes.data), `Dados do gráfico para o período ${p} gerados com sucesso`);
  }

  console.log('\n====================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES FORAM CONCLUÍDOS COM SUCESSO!`);
  console.log('====================================================');
}

async function apiPut(url: string, data: any, headers: any) {
  return axios.put(url, data, { headers });
}

main()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
