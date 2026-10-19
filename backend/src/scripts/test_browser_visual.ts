import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\leona\\.gemini\\antigravity\\brain\\a8c46d87-277c-4fef-a82c-5cb23903e33f\\edge_test_profile';
const artifactDir = 'C:\\Users\\leona\\.gemini\\antigravity\\brain\\a8c46d87-277c-4fef-a82c-5cb23903e33f';

async function main() {
  console.log('1. Autenticando com pethub@gmail.com na API...');
  const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'pethub@gmail.com',
    password: '123456789',
  });
  const { token, user } = loginRes.data;
  console.log('Token obtido para:', user.name);

  // Iniciar Edge Headless com porta CDP 9222
  console.log('2. Iniciando Edge Headless com DevTools Protocol...');
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,950',
    'about:blank',
  ]);

  // Aguardar porta 9222 estar pronta
  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await axios.get('http://127.0.0.1:9222/json');
      if (res.data?.[0]?.webSocketDebuggerUrl) {
        wsUrl = res.data[0].webSocketDebuggerUrl;
        break;
      }
    } catch {
      // aguardar
    }
  }

  if (!wsUrl) {
    edgeProc.kill();
    throw new Error('Falha ao conectar no Edge CDP');
  }

  console.log('3. Conectado ao Edge CDP via WebSocket:', wsUrl);
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

  console.log('4. Navegando para http://localhost:5173 e injetando sessão de estabelecimento...');
  await send('Page.navigate', { url: 'http://localhost:5173/auth/login' });
  await new Promise(r => setTimeout(r, 1000));

  // Injetar localStorage pethub-auth
  const authState = {
    state: {
      token,
      currentRole: 'ESTABLISHMENT',
      currentUser: user,
      isAuthenticated: true,
      isAuthReady: true,
    },
    version: 0,
  };

  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('pethub-auth', JSON.stringify(${JSON.stringify(authState)}));`,
  });

  console.log('5. Navegando para http://localhost:5173/estabelecimento/funcionarios...');
  await send('Page.navigate', { url: 'http://localhost:5173/estabelecimento/funcionarios' });
  await new Promise(r => setTimeout(r, 2500));

  // Capturar screenshot da lista de cards de funcionários
  console.log('6. Capturando screenshot da lista de cards alinhados...');
  const cardShot = await send('Page.captureScreenshot', { format: 'png' });
  const cardShotBuf = Buffer.from(cardShot.data, 'base64');
  const cardShotPath = path.join(artifactDir, 'verified_employees_cards.png');
  fs.writeFileSync(cardShotPath, cardShotBuf);
  console.log('-> Salvo em:', cardShotPath);

  // Clicar no primeiro botão de editar para abrir o modal
  console.log('7. Abrindo modal de edição de funcionário...');
  await send('Runtime.evaluate', {
    expression: `
      const editButtons = document.querySelectorAll('button[title="Editar funcionário"]');
      if (editButtons.length > 0) editButtons[0].click();
    `,
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capturar screenshot do modal com o campo de biografia
  console.log('8. Capturando screenshot do modal com Biografia / Observações...');
  const modalShot = await send('Page.captureScreenshot', { format: 'png' });
  const modalShotBuf = Buffer.from(modalShot.data, 'base64');
  const modalShotPath = path.join(artifactDir, 'verified_employees_modal.png');
  fs.writeFileSync(modalShotPath, modalShotBuf);
  console.log('-> Salvo em:', modalShotPath);

  ws.close();
  edgeProc.kill();
  console.log('Testes visuais no navegador concluídos com sucesso!');
}

main().catch(err => {
  console.error('Erro no teste de navegador:', err);
  process.exit(1);
});
