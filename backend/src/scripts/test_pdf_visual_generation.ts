import axios from 'axios';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

const API_URL = 'http://localhost:3000/api';

async function main() {
  console.log('====================================================');
  console.log('INICIANDO TESTE COMPLETO DE EXPORTACAO PDF');
  console.log('====================================================\n');

  // 1. Admin setup & login
  let admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        name: 'Admin Teste PetHub',
        email: 'admin_test_export@pethub.com',
        password: hashedPassword,
        hasPassword: true,
        role: Role.ADMIN,
      },
    });
  } else {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword, hasPassword: true },
    });
  }

  // Clear any test suspension on establishment
  await prisma.establishmentProfile.updateMany({
    data: { suspendedUntil: null, suspensionReason: null },
  });

  const adminLogin = await axios.post(`${API_URL}/auth/login`, {
    email: admin.email,
    password: 'admin123',
  });
  const adminToken = adminLogin.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2. Establishment setup & login
  let estab = await prisma.user.findFirst({
    where: { role: Role.ESTABLISHMENT },
    include: { establishmentProfile: true },
  });
  if (!estab) {
    const hashedPassword = await bcrypt.hash('estab123', 10);
    estab = await prisma.user.create({
      data: {
        name: 'Estabelecimento Teste',
        email: 'estab_test_export@pethub.com',
        password: hashedPassword,
        hasPassword: true,
        role: Role.ESTABLISHMENT,
        establishmentProfile: {
          create: {
            businessName: 'PetCare Teste Oficial',
            document: '12.345.678/0001-90',
          },
        },
      },
      include: { establishmentProfile: true },
    });
  } else {
    const hashedPassword = await bcrypt.hash('estab123', 10);
    estab = await prisma.user.update({
      where: { id: estab.id },
      data: { password: hashedPassword, hasPassword: true },
      include: { establishmentProfile: true },
    });
  }

  const estabLogin = await axios.post(`${API_URL}/auth/login`, {
    email: estab.email,
    password: 'estab123',
  });
  const estabToken = estabLogin.data.token;
  const estabHeaders = { Authorization: `Bearer ${estabToken}` };

  // 3. Professional setup & login
  let prof = await prisma.user.findFirst({
    where: { role: Role.PROFESSIONAL },
    include: { professionalProfile: true },
  });
  if (!prof) {
    const hashedPassword = await bcrypt.hash('prof123', 10);
    prof = await prisma.user.create({
      data: {
        name: 'Dra. Mariana Veterinaria',
        email: 'prof_test_export@pethub.com',
        password: hashedPassword,
        hasPassword: true,
        role: Role.PROFESSIONAL,
        professionalProfile: {
          create: {
            document: 'CRMV-SP 54321',
            specialty: 'Dermatologia Veterinaria',
          },
        },
      },
      include: { professionalProfile: true },
    });
  } else {
    const hashedPassword = await bcrypt.hash('prof123', 10);
    prof = await prisma.user.update({
      where: { id: prof.id },
      data: { password: hashedPassword, hasPassword: true },
      include: { professionalProfile: true },
    });
  }

  const profLogin = await axios.post(`${API_URL}/auth/login`, {
    email: prof.email,
    password: 'prof123',
  });
  const profToken = profLogin.data.token;
  const profHeaders = { Authorization: `Bearer ${profToken}` };

  const outDir = path.resolve(process.cwd(), 'test_output_pdfs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const dateRangeQuery = 'startDate=2026-08-01&endDate=2026-10-31';

  const exportsToTest = [
    { name: 'admin_finance', url: `${API_URL}/admin/export?type=finance&format=pdf&${dateRangeQuery}`, headers: adminHeaders },
    { name: 'admin_appointments', url: `${API_URL}/admin/export?type=appointments&format=pdf&${dateRangeQuery}`, headers: adminHeaders },
    { name: 'admin_pets', url: `${API_URL}/admin/export?type=pets&format=pdf&${dateRangeQuery}`, headers: adminHeaders },
    { name: 'admin_moderation', url: `${API_URL}/admin/export?type=moderation&format=pdf&${dateRangeQuery}`, headers: adminHeaders },
    { name: 'estab_services', url: `${API_URL}/reports/establishment/export?type=services&format=pdf&${dateRangeQuery}`, headers: estabHeaders },
    { name: 'estab_financial', url: `${API_URL}/reports/establishment/export?type=financial&format=pdf&${dateRangeQuery}`, headers: estabHeaders },
    { name: 'estab_inventory', url: `${API_URL}/reports/establishment/export?type=inventory&format=pdf&${dateRangeQuery}`, headers: estabHeaders },
    { name: 'estab_customers', url: `${API_URL}/reports/establishment/export?type=customers&format=pdf&${dateRangeQuery}`, headers: estabHeaders },
    { name: 'prof_services', url: `${API_URL}/reports/professional/export?type=services&format=pdf&${dateRangeQuery}`, headers: profHeaders },
    { name: 'prof_financial', url: `${API_URL}/reports/professional/export?type=financial&format=pdf&${dateRangeQuery}`, headers: profHeaders },
    { name: 'prof_customers', url: `${API_URL}/reports/professional/export?type=customers&format=pdf&${dateRangeQuery}`, headers: profHeaders },
  ];

  for (const item of exportsToTest) {
    console.log(`Gerando ${item.name}...`);
    const res = await axios.get(item.url, {
      headers: item.headers,
      responseType: 'arraybuffer',
    });
    if (res.status !== 200) throw new Error(`${item.name} falhou com status ${res.status}`);
    const buf = Buffer.from(res.data);
    const header = buf.slice(0, 4).toString();
    if (header !== '%PDF') throw new Error(`${item.name} nao possui assinatura valida %PDF`);

    const filePath = path.join(outDir, `${item.name}.pdf`);
    fs.writeFileSync(filePath, buf);
    console.log(`  -> ${item.name}.pdf gerado com sucesso (${buf.length} bytes)`);
  }

  console.log('\nTodos os 11 relatorios PDF foram gerados com sucesso!');
}

main().catch(e => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
