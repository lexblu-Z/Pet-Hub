import axios from 'axios';

async function test() {
  const login = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'pethub@gmail.com',
    password: '123456789',
  });
  const token = login.data.token;
  const client = axios.create({ baseURL: 'http://localhost:3000/api', headers: { Authorization: `Bearer ${token}` } });

  const periods = ['all', '30days', 'month', '7days', 'today'];

  for (const p of periods) {
    const dash = await client.get(`/establishment/dashboard?period=${p}`);
    console.log(`\n===============================================================`);
    console.log(`📊 DASHBOARD (period=${p})`);
    console.log(`===============================================================`);
    console.log(`- Receita Bruta Total: R$ ${dash.data.grossRevenue?.toFixed(2)}`);
    console.log(`- Receita Líquida Total: R$ ${dash.data.netRevenue?.toFixed(2)}`);
    console.log(`- Receita Serviços (KPI Principal): R$ ${dash.data.appointmentRevenue?.toFixed(2)}`);
    console.log(`- Receita Produtos (KPI Principal): R$ ${dash.data.productRevenue?.toFixed(2)}`);

    console.log('\nTop Serviços:');
    let sumTopServicesRev = 0;
    let sumTopServicesPending = 0;
    for (const s of dash.data.topServices || []) {
      sumTopServicesRev += s.revenue;
      sumTopServicesPending += s.pendingRevenue || 0;
      console.log(`  • ${s.name}: ${s.count} agendamentos | Faturado: R$ ${s.revenue.toFixed(2)} | Previsto/Pendente: R$ ${(s.pendingRevenue || 0).toFixed(2)}`);
    }
    console.log(`  -> Total Faturado dos Serviços: R$ ${sumTopServicesRev.toFixed(2)}`);
    console.log(`  -> Total Previsto dos Serviços: R$ ${sumTopServicesPending.toFixed(2)}`);

    console.log('\nTop Produtos:');
    let sumTopProductsRev = 0;
    for (const prod of dash.data.topProducts || []) {
      sumTopProductsRev += prod.revenue;
      console.log(`  • ${prod.name}: ${prod.quantity} unidades | Faturado: R$ ${prod.revenue.toFixed(2)}`);
    }
    console.log(`  -> Total Faturado dos Produtos: R$ ${sumTopProductsRev.toFixed(2)}`);

    const totalCardsFaturado = sumTopServicesRev + sumTopProductsRev;
    console.log(`\nReconciliação Matemática:`);
    console.log(`  • Soma dos Cartões (Faturado): R$ ${totalCardsFaturado.toFixed(2)}`);
    console.log(`  • Indicador Principal (Net Revenue): R$ ${dash.data.netRevenue.toFixed(2)}`);
    const diff = Math.abs(totalCardsFaturado - dash.data.netRevenue);
    console.log(`  • Divergência: R$ ${diff.toFixed(2)} ${diff < 0.01 ? '✅ PERFEITO (ZERO DIVERGÊNCIA)' : '❌ DIVERGÊNCIA DETECTADA'}`);
  }
}

test().catch(console.error);
