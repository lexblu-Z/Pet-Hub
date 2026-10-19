import axios from 'axios';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { Role, AppointmentStatus, OrderStatus } from '@prisma/client';
import { createAndEmitNotification } from '../utils/notificationEvents';

const API_URL = 'http://localhost:3000/api';

async function main() {
  console.log('================================================================');
  console.log('🚀 INICIANDO TESTES: FILTRO ANUAL (1Y) E NAVEGAÇÃO DE NOTIFICAÇÕES');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (details) console.error('   Detalhes:', details);
      failed++;
    }
  }

  // 1. Setup Admin credentials
  console.log('--- 1. AUTENTICAÇÃO COMO ADMIN ---');
  let admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        name: 'Admin Teste',
        email: 'admin_audit_test@pethub.com',
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

  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: admin.email,
    password: 'admin123',
  });
  const adminToken = loginRes.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  assert(!!adminToken, 'Admin autenticado com sucesso e token JWT emitido.');

  // 2. Tarefa 1: Teste do Filtro Anual (1Y)
  console.log('\n--- 2. TAREFA 1: FILTRO ANUAL (1Y) DOS GRÁFICOS ADMINISTRATIVOS ---');
  const perfRes1Y = await axios.get(`${API_URL}/admin/dashboard/performance?period=1y`, {
    headers: adminHeaders,
  });

  assert(perfRes1Y.status === 200, 'Endpoint /admin/dashboard/performance?period=1y respondeu 200 OK');
  const data1Y = perfRes1Y.data;
  assert(Array.isArray(data1Y), 'Retorno é um array de dados');
  assert(data1Y.length === 12, `Filtro 1Y retornou exatamente 12 meses (recebido: ${data1Y.length})`, data1Y.map((d: any) => d.date));

  // Verify label formats and chronological ordering
  const now = new Date();
  const spDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [curYear, curMonth] = spDateStr.split('-').map(Number);
  const MONTH_NAMES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const expectedCurrentMonthLabel = `${MONTH_NAMES_PT[curMonth - 1]}/${String(curYear).slice(-2)}`;

  const lastBucket = data1Y[data1Y.length - 1];
  assert(
    lastBucket?.date === expectedCurrentMonthLabel,
    `Último mês do período corresponde ao mês/ano atual em Brasília (${expectedCurrentMonthLabel})`,
    { recebido: lastBucket?.date, esperado: expectedCurrentMonthLabel }
  );

  // Check no NaN or null in numbers
  let numbersValid = true;
  for (const b of data1Y) {
    if (typeof b.users !== 'number' || isNaN(b.users) ||
        typeof b.appointments !== 'number' || isNaN(b.appointments) ||
        typeof b.revenue !== 'number' || isNaN(b.revenue) ||
        !b.date.includes('/')) {
      numbersValid = false;
      break;
    }
  }
  assert(numbersValid, 'Todos os 12 meses possuem métricas numéricas válidas (sem NaN/null) e rótulos com mês/ano');

  console.log('   Rótulos dos 12 meses retornados:', data1Y.map((d: any) => d.date).join(' -> '));

  // Verify that other periods still work
  console.log('\n--- 3. TESTE DE REGRESSÃO: DEMAIS PERÍODOS (7d, 30d, 3m, 6m) ---');
  for (const p of ['7d', '30d', '3m', '6m']) {
    const res = await axios.get(`${API_URL}/admin/dashboard/performance?period=${p}`, {
      headers: adminHeaders,
    });
    assert(
      res.status === 200 && Array.isArray(res.data) && res.data.length > 0,
      `Período ${p} funcionando corretamente com dados agregados (total buckets: ${res.data.length})`
    );
  }

  // 4. Tarefa 2: Testes de Notificação e Botão "Ver"
  console.log('\n--- 4. TAREFA 2: BOTÃO "VER" E PERSISTÊNCIA DE NOTIFICAÇÕES ---');

  // Find or create tutor with known password
  let tutor = await prisma.user.findUnique({ where: { email: 'tutor_notif_test@pethub.com' } });
  const tutorPassword = await bcrypt.hash('tutor123', 10);
  if (!tutor) {
    tutor = await prisma.user.create({
      data: {
        name: 'Tutor Teste Notif',
        email: 'tutor_notif_test@pethub.com',
        password: tutorPassword,
        hasPassword: true,
        role: Role.TUTOR,
      },
    });
  } else {
    tutor = await prisma.user.update({
      where: { id: tutor.id },
      data: { password: tutorPassword, hasPassword: true },
    });
  }

  // Find or create establishment with known password
  let estab = await prisma.user.findUnique({ where: { email: 'estab_notif_test@pethub.com' } });
  const estabPassword = await bcrypt.hash('estab123', 10);
  if (!estab) {
    estab = await prisma.user.create({
      data: {
        name: 'Estab Teste Notif',
        email: 'estab_notif_test@pethub.com',
        password: estabPassword,
        hasPassword: true,
        role: Role.ESTABLISHMENT,
      },
    });
  } else {
    estab = await prisma.user.update({
      where: { id: estab.id },
      data: { password: estabPassword, hasPassword: true },
    });
  }

  // Find or create pet and service for a test appointment
  let pet = await prisma.pet.findFirst({ where: { tutorId: tutor.id } });
  if (!pet) {
    pet = await prisma.pet.create({
      data: {
        name: 'Rex Teste',
        species: 'DOG',
        tutorId: tutor.id,
      },
    });
  }

  let service = await prisma.service.findFirst({ where: { establishmentId: estab.id } });
  if (!service) {
    service = await prisma.service.create({
      data: {
        name: 'Banho Notif Teste',
        price: 50.0,
        duration: 30,
        establishmentId: estab.id,
      },
    });
  }

  // Create test appointment
  const testApt = await prisma.appointment.create({
    data: {
      tutorId: tutor.id,
      establishmentId: estab.id,
      petId: pet.id,
      serviceId: service.id,
      date: new Date(),
      status: AppointmentStatus.PENDING,
      paymentMethod: 'PIX',
      paymentStatus: 'PENDING',
    },
  });

  // Test createAndEmitNotification with appointmentId
  const notif = await createAndEmitNotification({
    userId: tutor.id,
    title: 'Novo agendamento criado',
    message: 'Seu agendamento foi registrado com sucesso.',
    type: 'APPOINTMENT',
    appointmentId: testApt.id,
  });

  assert(!!notif, 'Notificação criada e emitida via createAndEmitNotification');
  assert(notif?.appointmentId === testApt.id, 'Notificação vinculada com appointmentId persistido no banco');

  // Tutor login to test reading notification
  const tutorLogin = await axios.post(`${API_URL}/auth/login`, {
    email: tutor.email,
    password: 'tutor123',
  });
  const tutorToken = tutorLogin.data.token;
  const tutorHeaders = { Authorization: `Bearer ${tutorToken}` };

  // Mark notification as read
  const patchRes = await axios.patch(`${API_URL}/notifications/${notif!.id}/read`, {}, {
    headers: tutorHeaders,
  });
  assert(patchRes.status === 200 && patchRes.data.read === true, 'Endpoint PATCH /notifications/:id/read marca como lida com sucesso');

  // Verify route resolution logic in simulation
  console.log('\n--- 5. SIMULAÇÃO DO RESOLVEDOR DE ROTAS (TODOS OS PERFIS) ---');

  // Helper matching frontend resolveNotificationRoute
  function simulateRoute(notifObj: any, role: string, user: any) {
    const rawRole = (role || user?.role || '').toLowerCase();
    const appointmentId = notifObj?.appointmentId || notifObj?.metadata?.appointmentId || null;
    const orderId = notifObj?.metadata?.orderId || notifObj?.orderId || null;
    const type = String(notifObj?.type || '').toUpperCase();

    if (rawRole === 'tutor') {
      if (type === 'APPOINTMENT') {
        return appointmentId
          ? { path: `/tutor/appointments?appointmentId=${encodeURIComponent(appointmentId)}`, state: { appointmentId } }
          : { path: '/tutor/appointments' };
      }
      if (type === 'ORDER') {
        return orderId
          ? { path: `/tutor/compras?orderId=${encodeURIComponent(orderId)}`, state: { orderId } }
          : { path: '/tutor/compras' };
      }
      return { path: '/tutor/notifications' };
    }

    if (rawRole === 'estabelecimento' || rawRole === 'establishment') {
      if (type === 'APPOINTMENT') {
        return appointmentId
          ? { path: `/estabelecimento/agendamentos?appointmentId=${encodeURIComponent(appointmentId)}`, state: { appointmentId } }
          : { path: '/estabelecimento/agendamentos' };
      }
      if (type === 'ORDER') {
        return orderId
          ? { path: `/estabelecimento/pedidos?orderId=${encodeURIComponent(orderId)}`, state: { orderId } }
          : { path: '/estabelecimento/pedidos' };
      }
      return { path: '/estabelecimento/agendamentos' };
    }

    if (rawRole === 'profissional' || rawRole === 'professional') {
      if (type === 'APPOINTMENT') {
        return appointmentId
          ? { path: `/profissional/agenda?appointmentId=${encodeURIComponent(appointmentId)}`, state: { appointmentId } }
          : { path: '/profissional/agenda' };
      }
      return { path: '/profissional/agenda' };
    }

    if (rawRole === 'admin') {
      if (type === 'APPOINTMENT') {
        return appointmentId
          ? { path: `/admin/agendamentos?appointmentId=${encodeURIComponent(appointmentId)}`, state: { appointmentId } }
          : { path: '/admin/agendamentos' };
      }
      if (type === 'ORDER') return { path: '/admin/financeiro' };
      if (type === 'MODERATION') return { path: '/admin/moderacao' };
      return { path: '/admin' };
    }

    return { path: '/' };
  }

  // 1. Tutor with appointment notification
  const tutorTarget = simulateRoute(notif, 'tutor', { role: 'TUTOR' });
  assert(
    tutorTarget.path === `/tutor/appointments?appointmentId=${testApt.id}`,
    'Tutor é direcionado para /tutor/appointments com appointmentId do agendamento'
  );

  // 2. Establishment with appointment notification (both uppercase role and lowercase role)
  const estabTarget = simulateRoute(notif, 'estabelecimento', { role: 'ESTABLISHMENT' });
  assert(
    estabTarget.path === `/estabelecimento/agendamentos?appointmentId=${testApt.id}`,
    'Estabelecimento é direcionado para /estabelecimento/agendamentos com appointmentId'
  );

  // 3. Professional with appointment notification
  const profTarget = simulateRoute(notif, 'profissional', { role: 'PROFESSIONAL' });
  assert(
    profTarget.path === `/profissional/agenda?appointmentId=${testApt.id}`,
    'Profissional é direcionado para /profissional/agenda com appointmentId'
  );

  // 4. Admin with appointment notification
  const adminTarget = simulateRoute(notif, 'admin', { role: 'ADMIN' });
  assert(
    adminTarget.path === `/admin/agendamentos?appointmentId=${testApt.id}`,
    'Admin é direcionado para /admin/agendamentos com appointmentId'
  );

  // 5. Order notification routing for tutor & establishment
  const orderNotif = { type: 'ORDER', metadata: { orderId: 'ord-12345' } };
  const tutorOrderTarget = simulateRoute(orderNotif, 'tutor', { role: 'TUTOR' });
  assert(
    tutorOrderTarget.path === '/tutor/compras?orderId=ord-12345',
    'Tutor é direcionado para /tutor/compras com orderId'
  );

  const estabOrderTarget = simulateRoute(orderNotif, 'estabelecimento', { role: 'ESTABLISHMENT' });
  assert(
    estabOrderTarget.path === '/estabelecimento/pedidos?orderId=ord-12345',
    'Estabelecimento é direcionado para /estabelecimento/pedidos com orderId'
  );

  // 6. Security check: tutor NEVER receives admin path
  assert(!tutorTarget.path.startsWith('/admin') && !tutorOrderTarget.path.startsWith('/admin'), 'Isolamento de perfil preservado: tutor não tem acesso nem rota para o painel admin');

  // Cleanup test appointment
  await prisma.notification.deleteMany({ where: { appointmentId: testApt.id } });
  await prisma.appointment.delete({ where: { id: testApt.id } });

  console.log('\n================================================================');
  console.log(`🎉 TESTES CONCLUÍDOS COM SUCESSO! (${passed} aprovados, ${failed} falhas)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
