import { validateCPF, validateCNPJ, normalizeDocument } from '../utils/documentValidation';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function runValidation() {
  console.log('====================================================');
  console.log('🔍 PETHUB COMPREHENSIVE AUTOMATED VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. CPF Modulo-11 Algorithmic Verification
  console.log('--- 1. CPF Modulo-11 Algorithmic Validation ---');
  assert(validateCPF('52998224725').isValid, 'Valid CPF (52998224725) accepted');
  assert(!validateCPF('11111111111').isValid, 'Repeated digits CPF (11111111111) rejected');
  assert(!validateCPF('52998224724').isValid, 'Invalid CPF checksum rejected');
  assert(!validateCPF('123').isValid, 'Short CPF string rejected');
  assert(normalizeDocument('529.982.247-25') === '52998224725', 'CPF formatting cleaned to pure digits');

  // 2. CNPJ Modulo-11 Algorithmic Verification
  console.log('\n--- 2. CNPJ Modulo-11 Algorithmic Validation ---');
  assert(validateCNPJ('11222333000181').isValid, 'Valid CNPJ (11222333000181) accepted');
  assert(!validateCNPJ('00000000000000').isValid, 'Repeated digits CNPJ rejected');
  assert(!validateCNPJ('11222333000180').isValid, 'Invalid CNPJ checksum rejected');
  assert(normalizeDocument('11.222.333/0001-81') === '11222333000181', 'CNPJ formatting cleaned to pure digits');

  // 3. Official Logo Asset Propagation
  console.log('\n--- 3. Official Logo Asset Verification ---');
  const rootLogo = path.resolve(process.cwd(), '../logo.jpg');
  const backendLogo = path.resolve(process.cwd(), 'src/assets/logo.jpg');
  const frontendLogo = path.resolve(process.cwd(), '../pethub-frontend/public/logo.jpg');
  assert(fs.existsSync(rootLogo), 'Root logo.jpg exists');
  assert(fs.existsSync(backendLogo), 'Backend src/assets/logo.jpg exists');
  assert(fs.existsSync(frontendLogo), 'Frontend public/logo.jpg exists');

  // 4. WhatsApp Official Vector Verification
  console.log('\n--- 4. WhatsApp Official Vector Verification ---');
  const whatsappVector = path.resolve(process.cwd(), '../uploads/icones/Whatsapp-logo-vetor.png');
  const whatsappPublic = path.resolve(process.cwd(), '../pethub-frontend/public/icones/whatsapp.png');
  const whatsappIconComponent = path.resolve(process.cwd(), '../pethub-frontend/src/components/shared/WhatsAppIcon.tsx');
  assert(fs.existsSync(whatsappVector), 'uploads/icones/Whatsapp-logo-vetor.png exists');
  assert(fs.existsSync(whatsappPublic), 'Frontend public/icones/whatsapp.png exists');
  assert(fs.existsSync(whatsappIconComponent), 'WhatsAppIcon component exists');

  // 5. Pix Official 4-lobed Vector Verification
  console.log('\n--- 5. Pix Official Vector Verification ---');
  const pixSvgPath = path.resolve(process.cwd(), '../uploads/pgmntos/logo_pix.svg');
  const pixFrontendSvg = path.resolve(process.cwd(), '../pethub-frontend/public/pgmntos/logo_pix.svg');
  assert(fs.existsSync(pixSvgPath), 'uploads/pgmntos/logo_pix.svg exists');
  assert(fs.existsSync(pixFrontendSvg), 'Frontend public/pgmntos/logo_pix.svg exists');
  if (fs.existsSync(pixSvgPath)) {
    const pixSvg = fs.readFileSync(pixSvgPath, 'utf8');
    assert(pixSvg.includes('536 26 80 80'), 'Pix SVG has correct 4-lobed diamond viewBox');
    assert(pixSvg.includes('#32BCAD'), 'Pix SVG uses official Central Bank #32BCAD teal color');
  }

  // 6. Species Vector Icons Verification
  console.log('\n--- 6. Species Vector Icons Verification ---');
  const speciesComponentPath = path.resolve(process.cwd(), '../pethub-frontend/src/components/shared/SpeciesIcon.tsx');
  assert(fs.existsSync(speciesComponentPath), 'SpeciesIcon.tsx component exists');
  if (fs.existsSync(speciesComponentPath)) {
    const content = fs.readFileSync(speciesComponentPath, 'utf8');
    assert(content.includes('DogVector'), 'Includes DogVector');
    assert(content.includes('CatVector'), 'Includes CatVector');
    assert(content.includes('BirdVector'), 'Includes BirdVector');
    assert(content.includes('RabbitVector'), 'Includes RabbitVector');
    assert(content.includes('RodentVector'), 'Includes RodentVector');
    assert(content.includes('ReptileVector'), 'Includes ReptileVector');
    assert(content.includes('FishVector'), 'Includes FishVector');
    assert(content.includes('OtherFaunaVector'), 'Includes OtherFaunaVector');
  }

  // 7. Database Verification: Real Avatars & Notifications
  console.log('\n--- 7. Database Schema & Query Integrity ---');
  try {
    const sampleUser = await prisma.user.findFirst({
      select: { id: true, name: true, role: true, avatar: true, defaultAvatar: true },
    });
    assert(sampleUser !== null, 'Database is populated and accessible');
    if (sampleUser) {
      console.log(`   Sample User ID: ${sampleUser.id} | Role: ${sampleUser.role}`);
    }

    const appointmentCount = await prisma.appointment.count();
    console.log(`   Total appointments in database: ${appointmentCount}`);
    assert(appointmentCount >= 0, 'Appointments queryable');

    const notificationCount = await prisma.notification.count();
    console.log(`   Total notifications in database: ${notificationCount}`);
    assert(notificationCount >= 0, 'Notifications queryable');
  } catch (err: any) {
    assert(false, 'Database connection failed', err.message);
  }

  console.log('\n====================================================');
  console.log(`FINAL RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runValidation();
