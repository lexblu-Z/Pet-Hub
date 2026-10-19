import axios from 'axios';

async function verify() {
  const login = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'pethub@gmail.com',
    password: '123456789',
  });
  const token = login.data.token;
  const client = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { Authorization: `Bearer ${token}` },
  });

  const dashRes = await client.get('/establishment/dashboard?period=all');
  console.log('=== DASHBOARD (period=all) ===');
  console.log(`- Receita Bruta Total: R$ ${dashRes.data.grossRevenue?.toFixed(2)}`);
  console.log(`- Receita Líquida Total: R$ ${dashRes.data.netRevenue?.toFixed(2)}`);
  console.log(`- Receita de Serviços Concluídos e Pagos: R$ ${dashRes.data.appointmentRevenue?.toFixed(2)}`);
  console.log(`- Receita de Produtos Vendidos: R$ ${dashRes.data.productRevenue?.toFixed(2)}`);
  console.log(`- Agendamentos Concluídos: ${dashRes.data.appointments?.completed}`);

  const dash30 = await client.get('/establishment/dashboard?period=30days');
  console.log('\n=== DASHBOARD (period=30days) ===');
  console.log(`- Receita Líquida (30 dias): R$ ${dash30.data.netRevenue?.toFixed(2)}`);
  console.log(`- Receita de Serviços (30 dias): R$ ${dash30.data.appointmentRevenue?.toFixed(2)}`);
  console.log(`- Receita de Produtos (30 dias): R$ ${dash30.data.productRevenue?.toFixed(2)}`);

  const finRep = await client.get('/reports/establishment/financial');
  console.log('\n=== RELATÓRIO FINANCEIRO (Mês Atual) ===');
  console.log(`- Receita Bruta Realizada: R$ ${finRep.data.summary?.grossRevenueRealized?.toFixed(2)}`);
  console.log(`- Receita de Serviços Realizada: R$ ${finRep.data.summary?.grossRevenueServices?.toFixed(2)}`);
  console.log(`- Receita de Produtos Realizada: R$ ${finRep.data.summary?.grossRevenueProducts?.toFixed(2)}`);
  console.log(`- Total de Transações: ${finRep.data.summary?.totalTransactionsCount}`);
}

verify().catch(console.error);
