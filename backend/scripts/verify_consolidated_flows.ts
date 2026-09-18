import { prisma } from '../src/lib/prisma';
import { validateCPF, validateAndNormalizeDocument } from '../src/utils/documentValidation';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

function generateValidCPF(): string {
  const rnd = () => Math.floor(Math.random() * 9);
  const n = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()];
  
  let d1 = n.reduce((total, num, idx) => total + num * (10 - idx), 0);
  d1 = 11 - (d1 % 11);
  d1 = d1 >= 10 ? 0 : d1;
  n.push(d1);

  let d2 = n.reduce((total, num, idx) => total + num * (11 - idx), 0);
  d2 = 11 - (d2 % 11);
  d2 = d2 >= 10 ? 0 : d2;
  n.push(d2);

  return n.join('');
}

async function runVerification() {
  console.log('==================================================');
  console.log('STARTING QA VERIFICATION: TUTOR, PETS, CPF, ASSETS');
  console.log('==================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failedTests++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: CPF Algorithm Validation & Rejection
  // ----------------------------------------------------
  console.log('--- TEST 1: Centralized CPF Validation Algorithm ---');
  const validCpf = generateValidCPF();
  const validCpfResult = validateCPF(validCpf);
  assert(validCpfResult.isValid === true, `Generated valid CPF (${validCpf}) recognized as valid`);

  const invalidCpf1 = '11111111111';
  assert(validateCPF(invalidCpf1).isValid === false, 'Repeated digits (11111111111) rejected');

  const invalidCpf2 = '12345678900';
  assert(validateCPF(invalidCpf2).isValid === false, 'Wrong check digit rejected');

  const invalidCpf3 = '123';
  assert(validateCPF(invalidCpf3).isValid === false, 'Short length rejected');

  // ----------------------------------------------------
  // TEST 2: Tutor Creation with CPF and Uniqueness
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Tutor CPF Persistence and Duplicate Prevention ---');
  const testTutorCpf = generateValidCPF();
  const testEmail = `tutor_test_${Date.now()}@pethub.com`;

  // Create Tutor user with CPF
  const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
  const tutorUser = await prisma.user.create({
    data: {
      name: 'Tutor QA Tester',
      email: testEmail,
      password: hashedPassword,
      hasPassword: true,
      phone: '(14) 99888-7766',
      document: testTutorCpf,
      role: 'TUTOR',
      city: 'Ourinhos',
      state: 'SP',
    },
  });

  assert(Boolean(tutorUser.id), 'Tutor user created successfully in DB');
  assert(tutorUser.document === testTutorCpf, `Tutor CPF persisted correctly: ${tutorUser.document}`);

  // Test duplicate check logic
  const dupCheck = await prisma.user.findFirst({
    where: { document: testTutorCpf },
  });
  assert(dupCheck !== null && dupCheck.id === tutorUser.id, 'Duplicate check finds existing CPF in DB');

  // ----------------------------------------------------
  // TEST 3: Pet Full Fields Creation & Unknowns
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Pet Creation with Full Fields & "Não sei" Support ---');

  // Pet 1: Full data (Name, Species, Breed, Gender, BirthDate, Weight, isNeutered, vaccinationStatus, specialCareNotes)
  const pet1BirthDate = new Date('2022-05-15');
  const petFull = await prisma.pet.create({
    data: {
      name: 'Maximus Thor',
      species: 'dog',
      breed: 'Golden Retriever',
      gender: 'MALE',
      birthDate: pet1BirthDate,
      approximateAge: null,
      weight: 32.5,
      isNeutered: true,
      vaccinationStatus: 'UP_TO_DATE',
      specialCareNotes: 'Alergia a rações de frango; necessita de medicação oftálmica diária.',
      behaviorNotes: 'Dócil e sociável com outros animais.',
      tutorId: tutorUser.id,
    },
  });

  assert(Boolean(petFull.id), 'Full Pet created in database');
  assert(petFull.name === 'Maximus Thor', 'Pet name matches');
  assert(petFull.species === 'dog', 'Pet species matches');
  assert(petFull.breed === 'Golden Retriever', 'Pet breed matches');
  assert(petFull.gender === 'MALE', 'Pet gender is MALE');
  assert(petFull.weight === 32.5, 'Pet weight is 32.5 kg');
  assert(petFull.isNeutered === true, 'Pet isNeutered is true');
  assert(petFull.vaccinationStatus === 'UP_TO_DATE', 'Pet vaccinationStatus is UP_TO_DATE');
  assert(petFull.specialCareNotes?.includes('Alergia') === true, 'Pet specialCareNotes matches');

  // Pet 2: Unknown data (Unknown weight, unknown age, unknown neutered, unknown vaccination)
  const petUnknown = await prisma.pet.create({
    data: {
      name: 'Mimi Resgatada',
      species: 'cat',
      breed: 'SRD (Sem raça definida)',
      gender: null,
      birthDate: null,
      approximateAge: 'Adulto (6 a 8 anos)',
      weight: null,
      isNeutered: null,
      vaccinationStatus: 'UNKNOWN',
      specialCareNotes: null,
      tutorId: tutorUser.id,
    },
  });

  assert(Boolean(petUnknown.id), 'Unknown fields Pet created in database');
  assert(petUnknown.approximateAge === 'Adulto (6 a 8 anos)', 'Approximate age stored for unknown birthdate');
  assert(petUnknown.weight === null, 'Weight gracefully stored as null when unknown');
  assert(petUnknown.isNeutered === null, 'Neutered status gracefully stored as null when unknown');
  assert(petUnknown.vaccinationStatus === 'UNKNOWN', 'Vaccination status stored as UNKNOWN');

  // ----------------------------------------------------
  // TEST 4: Cashback Asset & Public Folder Verification
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Cashback Asset (insp12.jpg) Verification ---');
  const frontendAssetPath = path.resolve(__dirname, '../../pethub-frontend/public/insp12.jpg');
  const assetExists = fs.existsSync(frontendAssetPath);
  assert(assetExists, `insp12.jpg exists in pethub-frontend/public: ${frontendAssetPath}`);

  if (assetExists) {
    const stats = fs.statSync(frontendAssetPath);
    assert(stats.size > 10000, `insp12.jpg has valid file size: ${stats.size} bytes`);
  }

  // ----------------------------------------------------
  // TEST 5: Clean Up Test Records
  // ----------------------------------------------------
  console.log('\n--- CLEANUP ---');
  await prisma.pet.deleteMany({ where: { tutorId: tutorUser.id } });
  await prisma.user.delete({ where: { id: tutorUser.id } });
  console.log('  Cleaned up test tutor and pets successfully.');

  console.log('\n==================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('==================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((e) => {
    console.error('Fatal error during verification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
