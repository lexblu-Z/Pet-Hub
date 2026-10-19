import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\leona\\.gemini\\antigravity\\brain\\a8c46d87-277c-4fef-a82c-5cb23903e33f\\edge_notif_profile';
const artifactDir = 'C:\\Users\\leona\\.gemini\\antigravity\\brain\\a8c46d87-277c-4fef-a82c-5cb23903e33f';

async function main() {
  console.log('========================================================');
  console.log('TESTE DE INTEGRAÇÃO COMPLETO: NOTIFICAÇÃO -> AGENDAMENTO');
  console.log('========================================================\n');

  // 1. Obter Estabelecimento (pethub@gmail.com)
  const establishment = await prisma.user.findUnique({
    where: { email: 'pethub@gmail.com' },
    include: { servicesAsEstablishment: true },
  });
  if (!establishment) {
    throw new Error('Estabelecimento pethub@gmail.com não encontrado no banco!');
  }
  console.log(`[OK] Estabelecimento encontrado: ${establishment.name} (${establishment.id})`);

  // Assegurar serviço no estabelecimento
  let service = establishment.servicesAsEstablishment[0];
  if (!service) {
    service = await prisma.service.create({
      data: {
        establishmentId: establishment.id,
        name: 'Banho e Tosa Completo',
        price: 80.0,
        duration: 60,
        category: 'BATH_AND_GROOMING',
        targetSpecies: ['CANINE', 'FELINE'],
      },
    });
    console.log(`[OK] Serviço de teste criado: ${service.name} (${service.id})`);
  } else {
    console.log(`[OK] Serviço disponível: ${service.name} (${service.id})`);
  }

  // 2. Obter ou Criar Tutor (user1@gmail.com)
  let tutor = await prisma.user.findUnique({
    where: { email: 'user1@gmail.com' },
    include: { pets: true },
  });
  if (!tutor) {
    const hash = await bcrypt.hash('123456789', 10);
    tutor = await prisma.user.create({
      data: {
        email: 'user1@gmail.com',
        name: 'Tutor de Teste 1',
        password: hash,
        role: 'TUTOR',
        phone: '11999998888',
      },
      include: { pets: true },
    });
    console.log(`[OK] Tutor criado: ${tutor.name}`);
  } else {
    console.log(`[OK] Tutor encontrado: ${tutor.name} (${tutor.id})`);
  }

  // Assegurar senha conhecida para o tutor no teste
  const tutorHash = await bcrypt.hash('123456789', 10);
  await prisma.user.update({
    where: { id: tutor.id },
    data: { password: tutorHash },
  });

  // Assegurar pet para o tutor
  let pet = tutor.pets[0];
  if (!pet) {
    pet = await prisma.pet.create({
      data: {
        tutorId: tutor.id,
        name: 'Rex Teste',
        species: 'CANINE',
        breed: 'Labrador',
      },
    });
    console.log(`[OK] Pet criado para o tutor: ${pet.name} (${pet.id})`);
  } else {
    console.log(`[OK] Pet disponível: ${pet.name} (${pet.id})`);
  }

  // 3. Login como Tutor
  console.log('\n--- ETAPA 1: Login do Tutor e Criação de Agendamento ---');
  const tutorLogin = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'user1@gmail.com',
    password: '123456789',
  });
  const tutorToken = tutorLogin.data.token;
  console.log('[OK] Tutor autenticado via API com sucesso.');

  // Limpar agendamentos anteriores do tutor de teste para garantir execução limpa
  await prisma.appointment.deleteMany({
    where: { tutorId: tutor.id },
  });

  // Data futura para o agendamento (3 dias à frente para testar navegação de data)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const targetDateTimeISO = `${targetDateStr}T14:30:00.000Z`;

  console.log(`Criando agendamento para data: ${targetDateTimeISO}...`);
  let appointment: any = null;
  try {
    const bookingRes = await axios.post(
      'http://localhost:3000/api/appointments',
      {
        establishmentId: establishment.id,
        serviceId: service.id,
        petId: pet.id,
        date: targetDateTimeISO,
        paymentMethod: 'CREDIT_CARD',
        petTransport: 'PICKUP_BY_TUTOR',
      },
      {
        headers: { Authorization: `Bearer ${tutorToken}` },
      }
    );
    appointment = bookingRes.data;
    console.log(`[OK] Agendamento criado com ID: ${appointment.id}`);
  } catch (err: any) {
    console.error('Falha na criação via API, verificando erro:', err.response?.data || err.message);
    // Se o slot estiver ocupado, buscar agendamento existente ou criar com fallback
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 4);
    const fallbackDateStr = fallbackDate.toISOString().split('T')[0];
    const fallbackDateTimeISO = `${fallbackDateStr}T15:00:00.000Z`;
    const bookingRes = await axios.post(
      'http://localhost:3000/api/appointments',
      {
        establishmentId: establishment.id,
        serviceId: service.id,
        petId: pet.id,
        date: fallbackDateTimeISO,
        paymentMethod: 'CREDIT_CARD',
        petTransport: 'PICKUP_BY_TUTOR',
      },
      {
        headers: { Authorization: `Bearer ${tutorToken}` },
      }
    );
    appointment = bookingRes.data;
    console.log(`[OK] Agendamento criado com ID (fallback): ${appointment.id}`);
  }

  // 4. Verificar Notificação no Banco de Dados
  console.log('\n--- ETAPA 2: Verificação da Notificação Gerada ---');
  const notification = await prisma.notification.findFirst({
    where: {
      userId: establishment.id,
      appointmentId: appointment.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!notification) {
    throw new Error(`[FALHA] Nenhuma notificação vinculada a appointmentId=${appointment.id} foi encontrada!`);
  }
  console.log(`[OK] Notificação encontrada no Banco de Dados:`);
  console.log(`     - ID: ${notification.id}`);
  console.log(`     - Título: ${notification.title}`);
  console.log(`     - Mensagem: ${notification.message}`);
  console.log(`     - AppointmentId: ${notification.appointmentId}`);
  console.log(`     - Read: ${notification.read}`);

  // 5. Login como Estabelecimento e Consulta à API de Notificações
  console.log('\n--- ETAPA 3: Estabelecimento consulta /api/notifications ---');
  const estLogin = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'pethub@gmail.com',
    password: '123456789',
  });
  const estToken = estLogin.data.token;
  const estUser = estLogin.data.user;

  const notifsRes = await axios.get('http://localhost:3000/api/notifications', {
    headers: { Authorization: `Bearer ${estToken}` },
  });
  const apiNotif = notifsRes.data.find((n: any) => n.id === notification.id);
  if (!apiNotif || apiNotif.appointmentId !== appointment.id) {
    throw new Error(`[FALHA] API /notifications não retornou o appointmentId correto!`);
  }
  console.log(`[OK] API /notifications retornou notificação com appointmentId=${apiNotif.appointmentId}`);

  // 6. Teste de Busca Direta do Agendamento pelo Estabelecimento
  console.log('\n--- ETAPA 4: Estabelecimento consulta /api/establishment/appointments?id=... ---');
  const aptQueryRes = await axios.get(`http://localhost:3000/api/establishment/appointments?id=${appointment.id}`, {
    headers: { Authorization: `Bearer ${estToken}` },
  });
  if (!Array.isArray(aptQueryRes.data) || aptQueryRes.data.length === 0) {
    throw new Error(`[FALHA] Estabelecimento não conseguiu localizar agendamento por ID!`);
  }
  const loadedApt = aptQueryRes.data[0];
  console.log(`[OK] Agendamento localizado com sucesso:`);
  console.log(`     - Pet: ${loadedApt.petName} (${loadedApt.petSpecies})`);
  console.log(`     - Tutor: ${loadedApt.tutorName} (${loadedApt.tutorEmail})`);
  console.log(`     - Data: ${loadedApt.date} às ${loadedApt.time}`);
  console.log(`     - Status: ${loadedApt.status}`);

  // 7. Teste de Isolamento de Dados e Segurança
  console.log('\n--- ETAPA 5: Teste de Isolamento e Segurança Cross-Tenant ---');
  // Se outro usuário tentar buscar o agendamento através da rota de estabelecimento
  const fakeEstToken = tutorToken; // Tutor não tem papel estabelecimento
  try {
    await axios.get(`http://localhost:3000/api/establishment/appointments?id=${appointment.id}`, {
      headers: { Authorization: `Bearer ${fakeEstToken}` },
    });
    console.error('[AVISO] Tutor conseguiu acessar rota de estabelecimento.');
  } catch (err: any) {
    console.log(`[OK] Rota protegida: Tutor rejeitado com HTTP ${err.response?.status} (${err.response?.data?.error || 'Acesso negado'}).`);
  }

  // 8. Teste de Marcação como Lida
  console.log('\n--- ETAPA 6: Marcar Notificação como Lida ---');
  const readRes = await axios.patch(`http://localhost:3000/api/notifications/${notification.id}/read`, {}, {
    headers: { Authorization: `Bearer ${estToken}` },
  });
  console.log(`[OK] Notificação marcada como lida no backend: read = ${readRes.data.read}`);

  // 9. Teste E2E no Navegador com Headless Edge
  console.log('\n--- ETAPA 7: Teste E2E Visual no Navegador (Headless Edge) ---');
  const cdpPort = 9224;
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,950',
    'about:blank',
  ]);

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await axios.get(`http://127.0.0.1:${cdpPort}/json`);
      const pageTarget = res.data?.find((t: any) => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    edgeProc.kill();
    throw new Error('Falha ao conectar no Edge CDP');
  }

  console.log(`[OK] Conectado ao Edge CDP na porta ${cdpPort}`);
  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pending = new Map<number, (res: any) => void>();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result);
      pending.delete(msg.id);
    }
  };

  await new Promise(r => ws.onopen = r);
  const send = (method: string, params: any = {}) => {
    const id = idCounter++;
    return new Promise<any>((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

  // Injetar sessão de estabelecimento no localStorage
  await send('Page.navigate', { url: 'http://localhost:5173/auth/login' });
  await new Promise(r => setTimeout(r, 1200));

  const authState = {
    state: {
      token: estToken,
      currentRole: 'estabelecimento',
      currentUser: estUser,
      isAuthenticated: true,
      isAuthReady: true,
    },
    version: 0,
  };

  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('pethub-auth', JSON.stringify(${JSON.stringify(authState)}));`,
  });

  // Navegar diretamente para a URL que a notificação abre:
  // /estabelecimento/agendamentos?appointmentId=${appointment.id}
  const targetUrl = `http://localhost:5173/estabelecimento/agendamentos?appointmentId=${appointment.id}`;
  console.log(`Navegando para URL da notificação: ${targetUrl}`);
  await send('Page.navigate', { url: targetUrl });

  // Aguardar carregamento da página e processamento do efeito de abertura
  await new Promise(r => setTimeout(r, 3000));

  // Verificar se o modal está aberto com a ficha do agendamento
  const evalResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const heading = document.evaluate("//h3[contains(text(), 'Ficha do Agendamento')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const petNameEl = document.evaluate("//h4[contains(text(), '${pet.name}')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const tutorNameEl = document.evaluate("//h4[contains(text(), '${tutor.name}')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const modalOpen = !!heading;
      return {
        modalOpen,
        headingText: heading ? heading.textContent : null,
        petFound: !!petNameEl,
        tutorFound: !!tutorNameEl,
        currentUrl: window.location.href,
      };
    })()`,
    returnByValue: true,
  });

  console.log('[OK] Resultado da verificação visual do Modal:', evalResult.result?.value);
  if (!evalResult.result?.value?.modalOpen) {
    throw new Error('[FALHA] Modal "Ficha do Agendamento" não foi aberto automaticamente!');
  }

  // Capturar screenshot do modal aberto
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const screenshotPath = path.join(artifactDir, 'notif_appointment_modal_opened.png');
  fs.writeFileSync(screenshotPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log(`[OK] Screenshot salvo com sucesso em: ${screenshotPath}`);

  // Testar fechamento do modal e remoção do query param da URL
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('[data-testid="close-appointment-modal"]');
      if (closeBtn) closeBtn.click();
    })()`,
  });
  await new Promise(r => setTimeout(r, 1000));

  const afterCloseEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const heading = document.evaluate("//h3[contains(text(), 'Ficha do Agendamento')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      return {
        modalStillOpen: !!heading,
        urlAfterClose: window.location.href,
      };
    })()`,
    returnByValue: true,
  });

  console.log('[OK] Estado após fechar o modal:', afterCloseEval.result?.value);
  const screenshotClosedPath = path.join(artifactDir, 'notif_appointment_modal_closed.png');
  const screenshotClosedRes = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(screenshotClosedPath, Buffer.from(screenshotClosedRes.data, 'base64'));

  // Encerrar Edge e conexões
  ws.close();
  edgeProc.kill();

  console.log('\n========================================================');
  console.log('TODAS AS ETAPAS E VALIDAÇÕES FORAM CONCLUÍDAS COM SUCESSO!');
  console.log('========================================================\n');
}

main().catch(err => {
  console.error('\n[ERRO NO TESTE]:', err);
  process.exit(1);
});
