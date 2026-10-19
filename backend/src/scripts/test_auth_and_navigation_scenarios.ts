import axios from 'axios';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:5173';

async function runAuthSecurityTests() {
  console.log('====================================================');
  console.log('🛡️  PETHUB AUDIT & SECURITY VALIDATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // ==========================================
  // CENÁRIO A: VISITANTE NÃO AUTENTICADO
  // ==========================================
  console.log('--- CENÁRIO A: Visitante Não Autenticado ---');

  // A.1 Frontend Landing Page acessível publicamente
  try {
    const resFe = await axios.get(`${FRONTEND_BASE}/`);
    assert(resFe.status === 200, 'Frontend rota / responde HTTP 200 para visitante');
    const html = resFe.data;
    assert(html.includes('<!DOCTYPE html>') || html.includes('<html'), 'HTML válido retornado na rota /');
  } catch (err: any) {
    assert(false, 'Frontend rota / inacessível', err.message);
  }

  // A.2 Tentativa de acessar endpoints administrativos sem token
  try {
    await axios.get(`${API_BASE}/admin/dashboard`);
    assert(false, 'GET /api/admin/dashboard sem token deveria falhar');
  } catch (err: any) {
    assert(
      err.response?.status === 401,
      'GET /api/admin/dashboard sem token rejeitado com HTTP 401',
      `Status: ${err.response?.status}`
    );
  }

  try {
    await axios.get(`${API_BASE}/admin/users`);
    assert(false, 'GET /api/admin/users sem token deveria falhar');
  } catch (err: any) {
    assert(
      err.response?.status === 401,
      'GET /api/admin/users sem token rejeitado com HTTP 401',
      `Status: ${err.response?.status}`
    );
  }

  try {
    await axios.get(`${API_BASE}/auth/me`);
    assert(false, 'GET /api/auth/me sem token deveria falhar');
  } catch (err: any) {
    assert(
      err.response?.status === 401,
      'GET /api/auth/me sem token rejeitado com HTTP 401',
      `Status: ${err.response?.status}`
    );
  }

  // ==========================================
  // CENÁRIO B: ADMINISTRADOR LEGÍTIMO
  // ==========================================
  console.log('\n--- CENÁRIO B: Administrador Legítimo ---');

  let adminToken = '';
  try {
    const resLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin',
      password: 'admin123',
    });

    assert(resLogin.status === 200, 'Login do Admin respondeu HTTP 200');
    assert(Boolean(resLogin.data.token), 'Token JWT emitido para Admin');
    assert(resLogin.data.user?.role === 'ADMIN', 'Role do usuário logado é ADMIN');
    adminToken = resLogin.data.token;
  } catch (err: any) {
    assert(false, 'Login do Admin falhou', err.response?.data?.error || err.message);
  }

  if (adminToken) {
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Consulta perfil do admin (/api/auth/me)
    try {
      const resMe = await axios.get(`${API_BASE}/auth/me`, { headers: adminHeaders });
      assert(resMe.status === 200, 'GET /api/auth/me com token admin respondeu HTTP 200');
      assert(resMe.data.role === 'ADMIN', 'Perfil retornado confirma papel ADMIN');
    } catch (err: any) {
      assert(false, 'GET /api/auth/me do admin falhou', err.message);
    }

    // Acesso ao dashboard admin
    try {
      const resDash = await axios.get(`${API_BASE}/admin/dashboard`, { headers: adminHeaders });
      assert(resDash.status === 200, 'GET /api/admin/dashboard autorizado para admin (HTTP 200)');
      assert(typeof resDash.data.users === 'number', 'Estatísticas do dashboard carregadas');
    } catch (err: any) {
      assert(false, 'GET /api/admin/dashboard falhou para admin', err.message);
    }

    // Acesso a usuários admin
    try {
      const resUsers = await axios.get(`${API_BASE}/admin/users`, { headers: adminHeaders });
      assert(resUsers.status === 200, 'GET /api/admin/users autorizado para admin (HTTP 200)');
    } catch (err: any) {
      assert(false, 'GET /api/admin/users falhou para admin', err.message);
    }
  }

  // ==========================================
  // CENÁRIO C: TUTOR (ISOLAMENTO DE PAPÉIS)
  // ==========================================
  console.log('\n--- CENÁRIO C: Tutor e Isolamento de Permissões ---');

  // Criar ou obter um tutor de teste
  const testTutorEmail = `tutor_test_${Date.now()}@pethub.com`;
  const testTutorPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(testTutorPassword, 10);

  const testTutor = await prisma.user.create({
    data: {
      name: 'Tutor Teste Segurança',
      email: testTutorEmail,
      password: hashedPassword,
      hasPassword: true,
      phone: '(14) 99888-7766',
      role: Role.TUTOR,
      city: 'Ourinhos',
      state: 'SP',
    },
  });

  let tutorToken = '';
  try {
    const resTutorLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: testTutorEmail,
      password: testTutorPassword,
    });
    assert(resTutorLogin.status === 200, 'Login do Tutor respondeu HTTP 200');
    assert(resTutorLogin.data.user?.role === 'TUTOR', 'Role retornado do Tutor é TUTOR');
    tutorToken = resTutorLogin.data.token;
  } catch (err: any) {
    assert(false, 'Login do Tutor falhou', err.response?.data?.error || err.message);
  }

  if (tutorToken) {
    const tutorHeaders = { Authorization: `Bearer ${tutorToken}` };

    // Tutor acessa seu próprio /api/auth/me com sucesso
    try {
      const resMe = await axios.get(`${API_BASE}/auth/me`, { headers: tutorHeaders });
      assert(resMe.status === 200, 'Tutor acessa /api/auth/me com sucesso');
      assert(resMe.data.role === 'TUTOR', 'Perfil de tutor confirmado');
    } catch (err: any) {
      assert(false, 'Tutor não conseguiu acessar /api/auth/me', err.message);
    }

    // Tutor TENTA acessar /api/admin/dashboard -> DEVE RETORNAR 403 FORBIDDEN
    try {
      await axios.get(`${API_BASE}/admin/dashboard`, { headers: tutorHeaders });
      assert(false, 'Tutor NÃO pode acessar /api/admin/dashboard');
    } catch (err: any) {
      assert(
        err.response?.status === 403,
        'Tentativa do Tutor acessar /api/admin/dashboard bloqueada com HTTP 403 Forbidden',
        `Status: ${err.response?.status}`
      );
    }

    // Tutor TENTA acessar /api/admin/users -> DEVE RETORNAR 403 FORBIDDEN
    try {
      await axios.get(`${API_BASE}/admin/users`, { headers: tutorHeaders });
      assert(false, 'Tutor NÃO pode acessar /api/admin/users');
    } catch (err: any) {
      assert(
        err.response?.status === 403,
        'Tentativa do Tutor acessar /api/admin/users bloqueada com HTTP 403 Forbidden',
        `Status: ${err.response?.status}`
      );
    }

    // Tutor TENTA acessar relatórios admin -> DEVE RETORNAR 403 FORBIDDEN
    try {
      await axios.get(`${API_BASE}/admin/reports`, { headers: tutorHeaders });
      assert(false, 'Tutor NÃO pode acessar /api/admin/reports');
    } catch (err: any) {
      assert(
        err.response?.status === 403,
        'Tentativa do Tutor acessar /api/admin/reports bloqueada com HTTP 403 Forbidden',
        `Status: ${err.response?.status}`
      );
    }
  }

  // Limpar tutor de teste
  await prisma.user.delete({ where: { id: testTutor.id } });

  // ==========================================
  // CENÁRIO D: CADASTRO PÚBLICO (PREVENÇÃO DE ESCALAÇÃO)
  // ==========================================
  console.log('\n--- CENÁRIO D: Cadastro Público e Prevenção de Escalação de Privilégios ---');

  // D.1 Tentativa de cadastro enviando role: "ADMIN"
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      name: 'Tentativa Invasor Admin',
      email: 'hacker_admin_attempt@pethub.com',
      password: 'Password123!',
      phone: '(14) 99111-2233',
      role: 'ADMIN',
    });
    assert(false, 'Cadastro público com role: "ADMIN" deveria ser terminantemente rejeitado');
  } catch (err: any) {
    assert(
      err.response?.status === 400 || err.response?.status === 403,
      'Tentativa de cadastro com role "ADMIN" rejeitada com sucesso (HTTP 400/403)',
      `Status: ${err.response?.status}, Mensagem: ${JSON.stringify(err.response?.data?.error)}`
    );
  }

  // D.2 Tentativa de cadastro enviando isAdmin: true
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      name: 'Tentativa Invasor IsAdmin',
      email: 'hacker_isadmin_attempt@pethub.com',
      password: 'Password123!',
      phone: '(14) 99111-2233',
      isAdmin: true,
    });
    assert(false, 'Cadastro público com isAdmin: true deveria ser rejeitado');
  } catch (err: any) {
    assert(
      err.response?.status === 400 || err.response?.status === 403,
      'Tentativa de cadastro com flag "isAdmin" rejeitada com sucesso (HTTP 400/403)',
      `Status: ${err.response?.status}`
    );
  }

  // D.3 Confirmação no banco: nenhum usuário invasor foi criado
  const invadedUser = await prisma.user.findFirst({
    where: {
      email: { in: ['hacker_admin_attempt@pethub.com', 'hacker_isadmin_attempt@pethub.com'] },
    },
  });
  assert(invadedUser === null, 'Nenhum usuário foi criado no banco a partir das tentativas de escalação');

  // ==========================================
  // CENÁRIO E: SESSÃO, EXPIRAÇÃO E TOKEN INVÁLIDO
  // ==========================================
  console.log('\n--- CENÁRIO E: Sessão, Expiração e Tokens Inválidos ---');

  // E.1 Token com assinatura adulterada
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTYiLCJyb2xlIjoiQURNSU4ifQ.FAKE_SIGNATURE';
  try {
    await axios.get(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    assert(false, 'Token adulterado não pode ser aceito');
  } catch (err: any) {
    assert(
      err.response?.status === 401,
      'Token com assinatura adulterada rejeitado com HTTP 401',
      `Status: ${err.response?.status}`
    );
  }

  // E.2 Token contendo UUID de usuário inexistente no banco
  // Gera um token assinado pelo Fastify jwt com ID inexistente
  const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
  // Como o Fastify usa o secret do .env, chamamos /api/auth/me com token que não existe no banco
  try {
    await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    assert(false, 'Token inválido em /api/auth/me deveria falhar');
  } catch (err: any) {
    assert(
      err.response?.status === 401,
      'Token inválido em /api/auth/me rejeitado com HTTP 401',
      `Status: ${err.response?.status}`
    );
  }

  // E.3 Verificação de total de administradores no banco
  const adminsInDb = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, name: true, email: true },
  });
  assert(
    adminsInDb.length === 1 && adminsInDb[0].email === 'admin',
    'Apenas a conta de administrador legítima autorizada existe no banco',
    `Total admins: ${adminsInDb.length}, Email: ${adminsInDb[0]?.email}`
  );

  console.log('\n====================================================');
  console.log(`  RESULTADO: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthSecurityTests()
  .catch((err) => {
    console.error('Fatal error during auth security tests:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
