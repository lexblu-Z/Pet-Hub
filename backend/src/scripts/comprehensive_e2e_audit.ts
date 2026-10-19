import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:3000/api';

interface AuditResult {
  step: string;
  category: 'TUTOR' | 'PROFESSIONAL' | 'ESTABLISHMENT' | 'SECURITY' | 'FINANCIAL';
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: AuditResult[] = [];

function record(category: AuditResult['category'], step: string, status: 'PASS' | 'FAIL', details: string) {
  results.push({ category, step, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${category}] ${step}: ${details}`);
}

async function createClient(token?: string): Promise<AxiosInstance> {
  return axios.create({
    baseURL: BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true, // Don't throw on error status codes
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 INICIANDO AUDITORIA TÉCNICA E FUNCIONAL INTEGRADA');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================\n');

  // ==========================================
  // 1. TUTOR AUDIT (user1@gmail.com)
  // ==========================================
  console.log('--- 1. AUDITANDO PERFIL TUTOR (user1@gmail.com) ---');
  let tutorToken = '';
  let tutorId = '';
  let testPetId = '';

  try {
    const unauthClient = await createClient();
    const loginRes = await unauthClient.post('/auth/login', {
      email: 'user1@gmail.com',
      password: '123456789',
    });

    if (loginRes.status === 200 && loginRes.data?.token) {
      tutorToken = loginRes.data.token;
      tutorId = loginRes.data.user?.id;
      record('TUTOR', 'Login de Tutor', 'PASS', `Status ${loginRes.status}, token recebido. Usuário: ${loginRes.data.user?.name}`);
    } else {
      record('TUTOR', 'Login de Tutor', 'FAIL', `Status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
    }
  } catch (err: any) {
    record('TUTOR', 'Login de Tutor', 'FAIL', `Erro de conexão: ${err.message}`);
  }

  if (tutorToken) {
    const tutorClient = await createClient(tutorToken);

    // Tutor Profile
    const profileRes = await tutorClient.get('/users/me/profile');
    if (profileRes.status === 200) {
      record('TUTOR', 'Obter Perfil do Tutor', 'PASS', `Perfil carregado: ${profileRes.data?.name || profileRes.data?.user?.name}`);
    } else {
      record('TUTOR', 'Obter Perfil do Tutor', 'FAIL', `Status ${profileRes.status}: ${JSON.stringify(profileRes.data)}`);
    }

    // Tutor Addresses
    const addrRes = await tutorClient.get('/users/me/addresses');
    if (addrRes.status === 200) {
      record('TUTOR', 'Listar Endereços do Tutor', 'PASS', `Status 200, endereços retornados: ${Array.isArray(addrRes.data) ? addrRes.data.length : 0}`);
    } else {
      record('TUTOR', 'Listar Endereços do Tutor', 'FAIL', `Status ${addrRes.status}: ${JSON.stringify(addrRes.data)}`);
    }

    // Tutor Pets List
    const petsRes = await tutorClient.get('/pets');
    if (petsRes.status === 200 && Array.isArray(petsRes.data)) {
      record('TUTOR', 'Listar Pets do Tutor', 'PASS', `${petsRes.data.length} pets encontrados.`);
      if (petsRes.data.length > 0) {
        testPetId = petsRes.data[0].id;
      }
    } else {
      record('TUTOR', 'Listar Pets do Tutor', 'FAIL', `Status ${petsRes.status}: ${JSON.stringify(petsRes.data)}`);
    }

    // Tutor Pet CRUD Lifecycle (Create -> Read -> Update -> Delete)
    const petName = `AuditPet_${Date.now()}`;
    const createPetRes = await tutorClient.post('/pets', {
      name: petName,
      species: 'DOG',
      breed: 'Vira-lata',
      gender: 'MALE',
      weight: 12.5,
      birthDate: '2023-01-01',
    });

    let createdAuditPetId = '';
    if (createPetRes.status === 201 || createPetRes.status === 200) {
      createdAuditPetId = createPetRes.data?.id;
      record('TUTOR', 'Criar Pet (CRUD)', 'PASS', `Pet temporário criado com sucesso (ID: ${createdAuditPetId})`);

      // Update Pet
      const updatePetRes = await tutorClient.put(`/pets/${createdAuditPetId}`, {
        name: `${petName}_Updated`,
        weight: 13.0,
      });
      if (updatePetRes.status === 200) {
        record('TUTOR', 'Atualizar Pet (CRUD)', 'PASS', `Pet atualizado com sucesso.`);
      } else {
        record('TUTOR', 'Atualizar Pet (CRUD)', 'FAIL', `Status ${updatePetRes.status}: ${JSON.stringify(updatePetRes.data)}`);
      }

      // Delete Pet (Clean up after audit)
      const delPetRes = await tutorClient.delete(`/pets/${createdAuditPetId}`);
      if (delPetRes.status === 200 || delPetRes.status === 204) {
        record('TUTOR', 'Excluir Pet (CRUD)', 'PASS', `Pet temporário excluído com sucesso.`);
      } else {
        record('TUTOR', 'Excluir Pet (CRUD)', 'FAIL', `Status ${delPetRes.status}: ${JSON.stringify(delPetRes.data)}`);
      }
    } else {
      record('TUTOR', 'Criar Pet (CRUD)', 'FAIL', `Status ${createPetRes.status}: ${JSON.stringify(createPetRes.data)}`);
    }

    // Explore Establishments
    const exploreRes = await tutorClient.get('/establishments');
    if (exploreRes.status === 200) {
      const estabs = Array.isArray(exploreRes.data) ? exploreRes.data : exploreRes.data?.establishments;
      record('TUTOR', 'Explorar Estabelecimentos', 'PASS', `Status 200, estabelecimentos disponíveis: ${estabs ? estabs.length : 0}`);
    } else {
      record('TUTOR', 'Explorar Estabelecimentos', 'FAIL', `Status ${exploreRes.status}: ${JSON.stringify(exploreRes.data)}`);
    }

    // Tutor Appointments List
    const apptsRes = await tutorClient.get('/appointments/me');
    if (apptsRes.status === 200 && Array.isArray(apptsRes.data)) {
      record('TUTOR', 'Listar Meus Agendamentos', 'PASS', `${apptsRes.data.length} agendamentos retornados.`);
    } else {
      record('TUTOR', 'Listar Meus Agendamentos', 'FAIL', `Status ${apptsRes.status}: ${JSON.stringify(apptsRes.data)}`);
    }

    // Tutor Notifications
    const notifsRes = await tutorClient.get('/notifications');
    if (notifsRes.status === 200) {
      record('TUTOR', 'Listar Notificações', 'PASS', `Notificações obtidas com sucesso.`);
    } else {
      record('TUTOR', 'Listar Notificações', 'FAIL', `Status ${notifsRes.status}: ${JSON.stringify(notifsRes.data)}`);
    }
  }

  // ==========================================
  // 2. PROFESSIONAL AUDIT (prof2@gmail.com)
  // ==========================================
  console.log('\n--- 2. AUDITANDO PERFIL PROFISSIONAL (prof2@gmail.com) ---');
  let profToken = '';
  let profId = '';

  try {
    const unauthClient = await createClient();
    const loginRes = await unauthClient.post('/auth/login', {
      email: 'prof2@gmail.com',
      password: 'prof123',
    });

    if (loginRes.status === 200 && loginRes.data?.token) {
      profToken = loginRes.data.token;
      profId = loginRes.data.user?.id;
      record('PROFESSIONAL', 'Login de Profissional', 'PASS', `Status ${loginRes.status}, token recebido. Usuário: ${loginRes.data.user?.name}`);
    } else {
      record('PROFESSIONAL', 'Login de Profissional', 'FAIL', `Status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
    }
  } catch (err: any) {
    record('PROFESSIONAL', 'Login de Profissional', 'FAIL', `Erro de conexão: ${err.message}`);
  }

  if (profToken) {
    const profClient = await createClient(profToken);

    // Professional Dashboard
    const profDashRes = await profClient.get('/professional/dashboard');
    if (profDashRes.status === 200) {
      record('PROFESSIONAL', 'Dashboard do Profissional', 'PASS', `Dashboard carregado. Próximos agendamentos: ${profDashRes.data?.upcomingAppointments?.length ?? 0}`);
    } else {
      record('PROFESSIONAL', 'Dashboard do Profissional', 'FAIL', `Status ${profDashRes.status}: ${JSON.stringify(profDashRes.data)}`);
    }

    // Professional Appointments
    const profApptsRes = await profClient.get('/professional/appointments');
    if (profApptsRes.status === 200) {
      record('PROFESSIONAL', 'Agendamentos do Profissional', 'PASS', `Status 200, agendamentos retornados.`);
    } else {
      record('PROFESSIONAL', 'Agendamentos do Profissional', 'FAIL', `Status ${profApptsRes.status}: ${JSON.stringify(profApptsRes.data)}`);
    }

    // Professional Work Orders
    const workOrdersRes = await profClient.get('/professional/work-orders');
    if (workOrdersRes.status === 200) {
      record('PROFESSIONAL', 'Ordens de Serviço do Profissional', 'PASS', `Status 200, ordens de serviço acessadas.`);
    } else {
      record('PROFESSIONAL', 'Ordens de Serviço do Profissional', 'FAIL', `Status ${workOrdersRes.status}: ${JSON.stringify(workOrdersRes.data)}`);
    }

    // Professional Reviews
    const reviewsRes = await profClient.get('/professional/reviews');
    if (reviewsRes.status === 200) {
      record('PROFESSIONAL', 'Avaliações do Profissional', 'PASS', `Status 200, avaliações acessadas.`);
    } else {
      record('PROFESSIONAL', 'Avaliações do Profissional', 'FAIL', `Status ${reviewsRes.status}: ${JSON.stringify(reviewsRes.data)}`);
    }

    // Professional Availability
    const availRes = await profClient.get('/professional/availability');
    if (availRes.status === 200) {
      record('PROFESSIONAL', 'Disponibilidade do Profissional', 'PASS', `Status 200, configurações de horário disponíveis.`);
    } else {
      record('PROFESSIONAL', 'Disponibilidade do Profissional', 'FAIL', `Status ${availRes.status}: ${JSON.stringify(availRes.data)}`);
    }

    // Professional Reports
    const profRepRes = await profClient.get('/reports/professional/financial');
    if (profRepRes.status === 200) {
      record('PROFESSIONAL', 'Relatório Financeiro do Profissional', 'PASS', `Status 200, relatório financeiro acessado.`);
    } else {
      record('PROFESSIONAL', 'Relatório Financeiro do Profissional', 'FAIL', `Status ${profRepRes.status}: ${JSON.stringify(profRepRes.data)}`);
    }

    // Professional Security Boundary: Ensure professional CANNOT access establishment-only routes
    const estabAccessRes = await profClient.get('/establishment/employees');
    if (estabAccessRes.status === 403 || estabAccessRes.status === 404 || estabAccessRes.status === 400 || (estabAccessRes.status === 200 && estabAccessRes.data?.error)) {
      record('SECURITY', 'Isolamento de Papel (Profissional -> Estabelecimento)', 'PASS', `Acesso negado ou restrito conforme esperado (Status ${estabAccessRes.status})`);
    } else {
      record('SECURITY', 'Isolamento de Papel (Profissional -> Estabelecimento)', 'FAIL', `Profissional conseguiu listar funcionários de terceiros! Status ${estabAccessRes.status}`);
    }
  }

  // ==========================================
  // 3. ESTABLISHMENT AUDIT (pethub@gmail.com)
  // ==========================================
  console.log('\n--- 3. AUDITANDO PERFIL ESTABELECIMENTO (pethub@gmail.com) ---');
  let estabToken = '';
  let estabId = '';

  try {
    const unauthClient = await createClient();
    const loginRes = await unauthClient.post('/auth/login', {
      email: 'pethub@gmail.com',
      password: '123456789',
    });

    if (loginRes.status === 200 && loginRes.data?.token) {
      estabToken = loginRes.data.token;
      estabId = loginRes.data.user?.id;
      record('ESTABLISHMENT', 'Login de Estabelecimento', 'PASS', `Status ${loginRes.status}, token recebido. Usuário: ${loginRes.data.user?.name}`);
    } else {
      record('ESTABLISHMENT', 'Login de Estabelecimento', 'FAIL', `Status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
    }
  } catch (err: any) {
    record('ESTABLISHMENT', 'Login de Estabelecimento', 'FAIL', `Erro de conexão: ${err.message}`);
  }

  if (estabToken) {
    const estabClient = await createClient(estabToken);

    // Dashboard
    const dashRes = await estabClient.get('/establishment/dashboard');
    if (dashRes.status === 200) {
      record('ESTABLISHMENT', 'Dashboard do Estabelecimento', 'PASS', `Dashboard carregado: ${dashRes.data?.establishment?.name}`);
    } else {
      record('ESTABLISHMENT', 'Dashboard do Estabelecimento', 'FAIL', `Status ${dashRes.status}: ${JSON.stringify(dashRes.data)}`);
    }

    // Profile & Working Hours
    const profRes = await estabClient.get('/establishment/profile');
    if (profRes.status === 200) {
      record('ESTABLISHMENT', 'Perfil do Estabelecimento', 'PASS', `Perfil verificado.`);
    } else {
      record('ESTABLISHMENT', 'Perfil do Estabelecimento', 'FAIL', `Status ${profRes.status}: ${JSON.stringify(profRes.data)}`);
    }

    const hoursRes = await estabClient.get('/establishment/hours');
    if (hoursRes.status === 200) {
      record('ESTABLISHMENT', 'Horários de Funcionamento', 'PASS', `Horários obtidos.`);
    } else {
      record('ESTABLISHMENT', 'Horários de Funcionamento', 'FAIL', `Status ${hoursRes.status}: ${JSON.stringify(hoursRes.data)}`);
    }

    // Services CRUD Lifecycle (List -> Create -> Read -> Update -> Delete)
    const servicesRes = await estabClient.get('/establishment/services');
    if (servicesRes.status === 200 && Array.isArray(servicesRes.data)) {
      record('ESTABLISHMENT', 'Listar Serviços', 'PASS', `${servicesRes.data.length} serviços cadastrados.`);
    } else {
      record('ESTABLISHMENT', 'Listar Serviços', 'FAIL', `Status ${servicesRes.status}: ${JSON.stringify(servicesRes.data)}`);
    }

    const tempSvcName = `Audit_Svc_${Date.now()}`;
    const createSvcRes = await estabClient.post('/establishment/services', {
      name: tempSvcName,
      description: 'Serviço de teste temporário para auditoria',
      price: 49.90,
      duration: 30,
      targetSpecies: ['DOG'],
      requiresPetWeight: false,
    });

    if (createSvcRes.status === 201 || createSvcRes.status === 200) {
      const svcId = createSvcRes.data?.id;
      record('ESTABLISHMENT', 'Criar Serviço (CRUD)', 'PASS', `Serviço criado com ID: ${svcId}`);

      const updateSvcRes = await estabClient.put(`/establishment/services/${svcId}`, {
        name: `${tempSvcName}_Updated`,
        price: 55.00,
        durationMinutes: 35,
      });
      if (updateSvcRes.status === 200) {
        record('ESTABLISHMENT', 'Atualizar Serviço (CRUD)', 'PASS', `Serviço atualizado com sucesso.`);
      } else {
        record('ESTABLISHMENT', 'Atualizar Serviço (CRUD)', 'FAIL', `Status ${updateSvcRes.status}: ${JSON.stringify(updateSvcRes.data)}`);
      }

      const delSvcRes = await estabClient.delete(`/establishment/services/${svcId}`);
      if (delSvcRes.status === 200 || delSvcRes.status === 204) {
        record('ESTABLISHMENT', 'Excluir Serviço (CRUD)', 'PASS', `Serviço temporário excluído com sucesso.`);
      } else {
        record('ESTABLISHMENT', 'Excluir Serviço (CRUD)', 'FAIL', `Status ${delSvcRes.status}: ${JSON.stringify(delSvcRes.data)}`);
      }
    } else {
      record('ESTABLISHMENT', 'Criar Serviço (CRUD)', 'FAIL', `Status ${createSvcRes.status}: ${JSON.stringify(createSvcRes.data)}`);
    }

    // Products CRUD Lifecycle (List -> Create -> Read -> Update -> Delete)
    const prodsRes = await estabClient.get('/establishment/products');
    if (prodsRes.status === 200 && Array.isArray(prodsRes.data)) {
      record('ESTABLISHMENT', 'Listar Produtos', 'PASS', `${prodsRes.data.length} produtos cadastrados.`);
    } else {
      record('ESTABLISHMENT', 'Listar Produtos', 'FAIL', `Status ${prodsRes.status}: ${JSON.stringify(prodsRes.data)}`);
    }

    const tempProdName = `Audit_Prod_${Date.now()}`;
    const createProdRes = await estabClient.post('/establishment/products', {
      name: tempProdName,
      description: 'Produto de teste temporário para auditoria',
      price: 29.90,
      stockQuantity: 10,
      category: 'Acessórios',
    });

    if (createProdRes.status === 201 || createProdRes.status === 200) {
      const prodId = createProdRes.data?.id;
      record('ESTABLISHMENT', 'Criar Produto (CRUD)', 'PASS', `Produto criado com ID: ${prodId}`);

      const updateProdRes = await estabClient.put(`/establishment/products/${prodId}`, {
        name: `${tempProdName}_Updated`,
        price: 32.50,
        stockQuantity: 15,
      });
      if (updateProdRes.status === 200) {
        record('ESTABLISHMENT', 'Atualizar Produto (CRUD)', 'PASS', `Produto atualizado com sucesso.`);
      } else {
        record('ESTABLISHMENT', 'Atualizar Produto (CRUD)', 'FAIL', `Status ${updateProdRes.status}: ${JSON.stringify(updateProdRes.data)}`);
      }

      const delProdRes = await estabClient.delete(`/establishment/products/${prodId}`);
      if (delProdRes.status === 200 || delProdRes.status === 204) {
        record('ESTABLISHMENT', 'Excluir Produto (CRUD)', 'PASS', `Produto temporário excluído com sucesso.`);
      } else {
        record('ESTABLISHMENT', 'Excluir Produto (CRUD)', 'FAIL', `Status ${delProdRes.status}: ${JSON.stringify(delProdRes.data)}`);
      }
    } else {
      record('ESTABLISHMENT', 'Criar Produto (CRUD)', 'FAIL', `Status ${createProdRes.status}: ${JSON.stringify(createProdRes.data)}`);
    }

    // Employees Management (List)
    const empRes = await estabClient.get('/establishment/employees');
    if (empRes.status === 200 && Array.isArray(empRes.data)) {
      record('ESTABLISHMENT', 'Listar Funcionários', 'PASS', `${empRes.data.length} funcionários cadastrados.`);
    } else {
      record('ESTABLISHMENT', 'Listar Funcionários', 'FAIL', `Status ${empRes.status}: ${JSON.stringify(empRes.data)}`);
    }

    // Orders Management (List)
    const ordersRes = await estabClient.get('/establishment/orders');
    if (ordersRes.status === 200 && Array.isArray(ordersRes.data)) {
      record('ESTABLISHMENT', 'Listar Pedidos', 'PASS', `${ordersRes.data.length} pedidos encontrados.`);
    } else {
      record('ESTABLISHMENT', 'Listar Pedidos', 'FAIL', `Status ${ordersRes.status}: ${JSON.stringify(ordersRes.data)}`);
    }

    // Appointments Management (List)
    const estabApptsRes = await estabClient.get('/establishment/appointments');
    if (estabApptsRes.status === 200 && Array.isArray(estabApptsRes.data)) {
      record('ESTABLISHMENT', 'Listar Agendamentos', 'PASS', `${estabApptsRes.data.length} agendamentos encontrados.`);
    } else {
      record('ESTABLISHMENT', 'Listar Agendamentos', 'FAIL', `Status ${estabApptsRes.status}: ${JSON.stringify(estabApptsRes.data)}`);
    }

    // Financial Reports & Exports
    const finRes = await estabClient.get('/reports/establishment/financial');
    if (finRes.status === 200) {
      record('FINANCIAL', 'Relatório Financeiro do Estabelecimento', 'PASS', `Status 200, dados financeiros calculados com sucesso.`);
    } else {
      record('FINANCIAL', 'Relatório Financeiro do Estabelecimento', 'FAIL', `Status ${finRes.status}: ${JSON.stringify(finRes.data)}`);
    }

    const srvRepRes = await estabClient.get('/reports/establishment/services');
    if (srvRepRes.status === 200) {
      record('FINANCIAL', 'Relatório de Serviços do Estabelecimento', 'PASS', `Status 200, relatório de serviços acessado.`);
    } else {
      record('FINANCIAL', 'Relatório de Serviços do Estabelecimento', 'FAIL', `Status ${srvRepRes.status}: ${JSON.stringify(srvRepRes.data)}`);
    }

    const invRepRes = await estabClient.get('/reports/establishment/inventory');
    if (invRepRes.status === 200) {
      record('FINANCIAL', 'Relatório de Estoque do Estabelecimento', 'PASS', `Status 200, relatório de estoque acessado.`);
    } else {
      record('FINANCIAL', 'Relatório de Estoque do Estabelecimento', 'FAIL', `Status ${invRepRes.status}: ${JSON.stringify(invRepRes.data)}`);
    }

    const exportCsvRes = await estabClient.get('/reports/establishment/export?type=financial&format=csv');
    if (exportCsvRes.status === 200) {
      record('FINANCIAL', 'Exportação de Relatório (CSV)', 'PASS', `CSV gerado com sucesso (${typeof exportCsvRes.data === 'string' ? exportCsvRes.data.length : 'ok'} bytes).`);
    } else {
      record('FINANCIAL', 'Exportação de Relatório (CSV)', 'FAIL', `Status ${exportCsvRes.status}: ${JSON.stringify(exportCsvRes.data)}`);
    }

    const exportPdfRes = await estabClient.get('/reports/establishment/export?type=financial&format=pdf', { responseType: 'arraybuffer' });
    if (exportPdfRes.status === 200) {
      record('FINANCIAL', 'Exportação de Relatório (PDF)', 'PASS', `PDF gerado com sucesso.`);
    } else {
      record('FINANCIAL', 'Exportação de Relatório (PDF)', 'FAIL', `Status ${exportPdfRes.status}: ${JSON.stringify(exportPdfRes.data)}`);
    }
  }

  console.log('\n====================================================');
  console.log('📊 RESUMO DA AUDITORIA INTEGRADA');
  console.log('====================================================');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total de verificações: ${results.length}`);
  console.log(`Aprovadas: ${passes} (${Math.round((passes / results.length) * 100)}%)`);
  console.log(`Falhas: ${fails}`);

  if (fails === 0) {
    console.log('\n🌟 AUDITORIA APROVADA COM 100% DE SUCESSO!');
  } else {
    console.log('\n⚠️ ITENS QUE EXIGEM ATENÇÃO:');
    results.filter((r) => r.status === 'FAIL').forEach((f) => {
      console.log(`- [${f.category}] ${f.step}: ${f.details}`);
    });
  }
}

runAudit().catch(console.error);
