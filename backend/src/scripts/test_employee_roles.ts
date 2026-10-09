import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import axios from 'axios';

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
  console.log('====================================================');
  console.log('🧑‍💼 TESTES DO CADASTRO E GESTÃO DE CARGO / GERENTE');
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

  // 1. Criar estabelecimento temporário para testes
  const tempEstab = await prisma.user.create({
    data: {
      name: 'PetShop Gerência QA',
      email: 'estab_gerencia_qa@test.com',
      password: 'hash_temporario',
      role: Role.ESTABLISHMENT,
      establishmentProfile: {
        create: {
          businessName: 'PetShop Gerência QA Ltda',
          document: '11.222.333/0001-81',
          status: 'ACTIVE',
        },
      },
    },
    include: { establishmentProfile: true },
  });

  const estabToken = makeToken(tempEstab);
  const headers = { Authorization: `Bearer ${estabToken}` };

  console.log(`🏢 Estabelecimento de teste criado: ${tempEstab.name} (${tempEstab.id})\n`);

  let createdEmployeeId = '';

  try {
    // -----------------------------------------------------------------
    // TESTE 1: Cadastrar funcionário com cargo "Gerente"
    // -----------------------------------------------------------------
    console.log('--- 1. Cadastrar funcionário como Gerente ---');
    const resCreate = await axios.post(
      `${API_BASE}/establishment/employees`,
      {
        name: 'João da Silva',
        role: 'Gerente',
        phone: '(14) 99888-7766',
        description: 'Responsável pela operação geral da clínica e equipe.',
        active: true,
      },
      { headers }
    );

    assert(resCreate.status === 201, '1. Cadastro retornou HTTP 201 Created');
    assert(resCreate.data.name === 'João da Silva', '1. Nome persistido corretamente');
    assert(resCreate.data.role === 'Gerente', '1. Cargo "Gerente" persistido no banco');
    assert(resCreate.data.establishmentId === tempEstab.id, '1. Vinculado ao estabelecimento correto');
    createdEmployeeId = resCreate.data.id;

    // -----------------------------------------------------------------
    // TESTE 2: Listagem (simulando recarregamento da página)
    // -----------------------------------------------------------------
    console.log('\n--- 2. Consultar listagem de colaboradores ---');
    const resList1 = await axios.get(`${API_BASE}/establishment/employees`, { headers });
    assert(resList1.status === 200, '2. Consulta de listagem retornou HTTP 200');
    const foundEmp1 = resList1.data.find((e: any) => e.id === createdEmployeeId);
    assert(foundEmp1 !== undefined, '2. Funcionário encontrado na listagem');
    assert(foundEmp1.role === 'Gerente', '2. Cargo permanece como "Gerente" na listagem');

    // -----------------------------------------------------------------
    // TESTE 3: Editar funcionário de Gerente para Banhista
    // -----------------------------------------------------------------
    console.log('\n--- 3. Alterar Gerente -> Banhista ---');
    const resUpdate1 = await axios.put(
      `${API_BASE}/establishment/employees/${createdEmployeeId}`,
      {
        role: 'Banhista',
      },
      { headers }
    );
    assert(resUpdate1.status === 200, '3. Edição retornou HTTP 200 OK');
    assert(resUpdate1.data.role === 'Banhista', '3. Cargo atualizado para Banhista');

    // Confirmar na listagem
    const resList2 = await axios.get(`${API_BASE}/establishment/employees`, { headers });
    const foundEmp2 = resList2.data.find((e: any) => e.id === createdEmployeeId);
    assert(foundEmp2.role === 'Banhista', '3. Cargo Banhista refletido na listagem');

    // -----------------------------------------------------------------
    // TESTE 4: Alterar de volta para Gerente
    // -----------------------------------------------------------------
    console.log('\n--- 4. Alterar Banhista -> Gerente ---');
    const resUpdate2 = await axios.put(
      `${API_BASE}/establishment/employees/${createdEmployeeId}`,
      {
        role: 'Gerente',
      },
      { headers }
    );
    assert(resUpdate2.status === 200, '4. Edição de volta retornou HTTP 200 OK');
    assert(resUpdate2.data.role === 'Gerente', '4. Cargo restaurado com sucesso para Gerente');

    // -----------------------------------------------------------------
    // TESTE 5: Testar as outras funções obrigatórias
    // -----------------------------------------------------------------
    console.log('\n--- 5. Testar outras funções obrigatórias (Funcionário, Tosador, Atendente) ---');
    for (const testRole of ['Funcionário', 'Tosador', 'Atendente']) {
      const resRole = await axios.put(
        `${API_BASE}/establishment/employees/${createdEmployeeId}`,
        { role: testRole },
        { headers }
      );
      assert(resRole.data.role === testRole, `5. Função "${testRole}" aceita e persistida`);
    }

    // -----------------------------------------------------------------
    // TESTE 6: Rejeição de cargo inválido no POST e no PUT
    // -----------------------------------------------------------------
    console.log('\n--- 6. Rejeição de cargos inválidos ---');
    let postInvalidRejected = false;
    try {
      await axios.post(
        `${API_BASE}/establishment/employees`,
        {
          name: 'Funcionário Hacker',
          role: 'SUPER_ADMIN_GLOBAL',
        },
        { headers }
      );
    } catch (err: any) {
      if (err.response?.status === 400) postInvalidRejected = true;
    }
    assert(postInvalidRejected, '6. POST com cargo inválido rejeitado com HTTP 400');

    let putInvalidRejected = false;
    try {
      await axios.put(
        `${API_BASE}/establishment/employees/${createdEmployeeId}`,
        {
          role: 'ADMIN_HACK',
        },
        { headers }
      );
    } catch (err: any) {
      if (err.response?.status === 400) putInvalidRejected = true;
    }
    assert(putInvalidRejected, '6. PUT com cargo inválido rejeitado com HTTP 400');

    // -----------------------------------------------------------------
    // TESTE 7: Garantia de Isolamento (Gerente não é ADMIN)
    // -----------------------------------------------------------------
    console.log('\n--- 7. Isolamento de Segurança: Gerente NÃO é ADMIN ---');
    // Restaurar como Gerente
    await axios.put(
      `${API_BASE}/establishment/employees/${createdEmployeeId}`,
      { role: 'Gerente' },
      { headers }
    );

    // Verificar no banco que Employee não existe na tabela User
    const userWithEmpId = await prisma.user.findUnique({
      where: { id: createdEmployeeId },
    });
    assert(userWithEmpId === null, '7. Employee NÃO cria conta de usuário no model User');

    // Verificar que o estabelecimento continua com Role.ESTABLISHMENT
    const checkEstab = await prisma.user.findUnique({
      where: { id: tempEstab.id },
    });
    assert(checkEstab?.role === Role.ESTABLISHMENT, '7. Estabelecimento permanece com Role.ESTABLISHMENT');

    // Verificar que o único ADMIN permanece o Administrador do Sistema
    const adminUsers = await prisma.user.findMany({
      where: { role: Role.ADMIN },
    });
    assert(adminUsers.length === 1, '7. Apenas 1 ADMIN existe no sistema');
    assert(
      adminUsers[0].id === '30ca9077-b6fd-4c14-84fc-6946109cb800',
      '7. O ADMIN é exclusivamente o Administrador do Sistema original'
    );

  } finally {
    // -----------------------------------------------------------------
    // LIMPEZA: Remover dados de teste para manter o banco limpo
    // -----------------------------------------------------------------
    console.log('\n🧹 Limpando dados do teste automatizado...');
    if (createdEmployeeId) {
      await prisma.employee.deleteMany({ where: { id: createdEmployeeId } });
    }
    await prisma.establishmentProfile.deleteMany({ where: { userId: tempEstab.id } });
    await prisma.user.deleteMany({ where: { id: tempEstab.id } });
    console.log('✅ Dados de teste limpos. O banco permanece limpo apenas com o ADMIN.');
  }

  console.log('\n====================================================');
  console.log(`🏁 RESULTADO DOS TESTES: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((err) => {
    console.error('💥 Erro fatal nos testes:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
