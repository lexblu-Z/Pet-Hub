import { prisma } from '../lib/prisma';
import {
  calculateExactAge,
  classifyAgeStage,
  getApproximateAgeOptions,
  formatPetAgeDisplay,
  getSpeciesAgeRule,
} from '../utils/speciesAgeRules';

async function runQATests() {
  console.log('====================================================');
  console.log('   PETHUB QA VALIDATION: VALUES & SPECIES PIPELINE  ');
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

  // Find an establishment user to associate products with
  const estabUser = await prisma.user.findFirst({
    where: { role: 'ESTABLISHMENT' },
  });

  const tutorUser = await prisma.user.findFirst({
    where: { role: 'TUTOR' },
  });

  console.log('--- TEST GROUP 1: Stock & Price Exact Integer/Float Preservation ---');
  if (estabUser) {
    const testStocks = [500, 100, 50, 10, 1];
    const testPrices = [49.9, 10.0, 8.8, 2.5, 1.0];

    for (let i = 0; i < testStocks.length; i++) {
      const stock = testStocks[i];
      const price = testPrices[i];

      const product = await prisma.product.create({
        data: {
          name: `__QA_TEST_PROD_${stock}__`,
          description: 'QA product test',
          price,
          stock,
          establishmentId: estabUser.id,
        },
      });

      const fetched = await prisma.product.findUnique({
        where: { id: product.id },
      });

      assert(
        fetched?.stock === stock,
        `Stock preservation for ${stock}`,
        `Expected ${stock}, got ${fetched?.stock}`
      );

      assert(
        fetched?.price === price,
        `Price preservation for ${price}`,
        `Expected ${price}, got ${fetched?.price}`
      );

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    }
  } else {
    console.log('  ⚠ SKIP: No establishment user found for product db tests');
  }

  console.log('\n--- TEST GROUP 2: Pet Weight & State Preservation ---');
  if (tutorUser) {
    const testWeights = [10.0, 8.8, 2.5, 1.0, 15.0];

    for (const w of testWeights) {
      const pet = await prisma.pet.create({
        data: {
          name: `__QA_PET_${w}__`,
          species: 'dog',
          weight: w,
          tutorId: tutorUser.id,
        },
      });

      const fetched = await prisma.pet.findUnique({ where: { id: pet.id } });
      assert(
        fetched?.weight === w,
        `Pet weight preservation for ${w} kg`,
        `Expected ${w}, got ${fetched?.weight}`
      );
      await prisma.pet.delete({ where: { id: pet.id } });
    }

    // Test unknown weight (weight: null)
    const unknownWeightPet = await prisma.pet.create({
      data: {
        name: '__QA_PET_UNKNOWN_WEIGHT__',
        species: 'turtle',
        weight: null,
        tutorId: tutorUser.id,
      },
    });

    const fetchedUnknown = await prisma.pet.findUnique({
      where: { id: unknownWeightPet.id },
    });
    assert(
      fetchedUnknown?.weight === null,
      'Pet unknown weight initialized as null',
      'Weight is null as expected'
    );
    await prisma.pet.delete({ where: { id: unknownWeightPet.id } });
  } else {
    console.log('  ⚠ SKIP: No tutor user found for pet db tests');
  }

  console.log('\n--- TEST GROUP 3: Species-Aware Biological Age Rules ---');

  // Helper to create birth date X years / months ago
  function getPastDate(yearsAgo: number, monthsAgo: number = 0): string {
    const now = new Date();
    const d = new Date(now.getFullYear() - yearsAgo, now.getMonth() - monthsAgo, now.getDate());
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 1. Turtle 12 years old -> Must NOT be senior. Must be 'young_adult' ("Adulto jovem")
  const turtle12Birth = getPastDate(12);
  const turtle12Age = calculateExactAge(turtle12Birth);
  const turtle12Stage = classifyAgeStage('turtle', turtle12Age.totalYearsFloat);
  assert(
    turtle12Age.years === 12,
    'Turtle age arithmetic: exactly 12 years',
    `years=${turtle12Age.years}`
  );
  assert(
    turtle12Stage.stage === 'young_adult',
    'Turtle at 12 years classified as Young Adult (NOT Senior)',
    `stage=${turtle12Stage.stage}, label=${turtle12Stage.label}`
  );
  assert(
    turtle12Stage.label === 'Adulto jovem',
    'Turtle at 12 years has label "Adulto jovem"',
    `label=${turtle12Stage.label}`
  );

  // 2. Turtle 60 years old -> Must be senior / idoso
  const turtle60Birth = getPastDate(60);
  const turtle60Age = calculateExactAge(turtle60Birth);
  const turtle60Stage = classifyAgeStage('turtle', turtle60Age.totalYearsFloat);
  assert(
    turtle60Age.years === 60,
    'Turtle age arithmetic: exactly 60 years',
    `years=${turtle60Age.years}`
  );
  assert(
    turtle60Stage.stage === 'senior',
    'Turtle at 60 years classified as Senior (Idoso)',
    `stage=${turtle60Stage.stage}, label=${turtle60Stage.label}`
  );

  // 3. Dog 12 years old -> Must be elderly / senior
  const dog12Birth = getPastDate(12);
  const dog12Age = calculateExactAge(dog12Birth);
  const dog12Stage = classifyAgeStage('dog', dog12Age.totalYearsFloat);
  assert(
    dog12Stage.stage === 'elderly' || dog12Stage.stage === 'senior',
    'Dog at 12 years classified as Elderly/Senior (Idoso)',
    `stage=${dog12Stage.stage}, label=${dog12Stage.label}`
  );

  // 4. Dog 8 months old -> Must be puppy ("Filhote")
  const dog8mBirth = getPastDate(0, 8);
  const dog8mAge = calculateExactAge(dog8mBirth);
  const dog8mStage = classifyAgeStage('dog', dog8mAge.totalYearsFloat);
  assert(
    dog8mStage.stage === 'puppy',
    'Dog at 8 months classified as Puppy (Filhote)',
    `stage=${dog8mStage.stage}, label=${dog8mStage.label}`
  );

  // 5. Cat 12 years old -> Must be senior ("Sênior")
  const cat12Birth = getPastDate(12);
  const cat12Age = calculateExactAge(cat12Birth);
  const cat12Stage = classifyAgeStage('cat', cat12Age.totalYearsFloat);
  assert(
    cat12Stage.stage === 'senior',
    'Cat at 12 years classified as Senior (Sênior)',
    `stage=${cat12Stage.stage}, label=${cat12Stage.label}`
  );

  // 6. Parrot 12 years old -> Must be young adult or adult (expectancy 50-70y)
  const parrot12Birth = getPastDate(12);
  const parrot12Age = calculateExactAge(parrot12Birth);
  const parrot12Stage = classifyAgeStage('parrot', parrot12Age.totalYearsFloat);
  assert(
    parrot12Stage.stage === 'young_adult' || parrot12Stage.stage === 'adult',
    'Parrot at 12 years classified as Young Adult / Adult (expectancy 50-70y)',
    `stage=${parrot12Stage.stage}, label=${parrot12Stage.label}`
  );

  // 7. Hamster 2 years old -> Must be senior/elderly ("Idoso")
  const hamster2Birth = getPastDate(2);
  const hamster2Age = calculateExactAge(hamster2Birth);
  const hamster2Stage = classifyAgeStage('hamster', hamster2Age.totalYearsFloat);
  assert(
    hamster2Stage.stage === 'senior' || hamster2Stage.stage === 'elderly',
    'Hamster at 2 years classified as Senior/Idoso (expectancy 2-3y)',
    `stage=${hamster2Stage.stage}, label=${hamster2Stage.label}`
  );

  console.log('\n--- TEST GROUP 4: Species-Tailored Approximate Age Dropdowns ---');
  const turtleOptions = getApproximateAgeOptions('turtle');
  assert(
    turtleOptions.some((opt) => opt.includes('50 anos') || opt.includes('Idoso')),
    'Turtle approximate age includes 50+ anos for senior',
    `Options: ${JSON.stringify(turtleOptions)}`
  );
  assert(
    turtleOptions.some((opt) => opt.includes('6 a 15 anos') && opt.includes('Adulto jovem')),
    'Turtle approximate age includes 6 a 15 anos as Adulto jovem',
    'Matched 6 a 15 anos'
  );

  const dogOptions = getApproximateAgeOptions('dog');
  assert(
    dogOptions.some((opt) => opt.includes('12 anos') || opt.includes('8 a 11 anos')),
    'Dog approximate age reflects canine life cycle (senior at 8-11y)',
    'Matched canine intervals'
  );

  const hamsterOptions = getApproximateAgeOptions('hamster');
  assert(
    hamsterOptions.some((opt) => opt.includes('meses')),
    'Hamster approximate age intervals use months/short years',
    `Options: ${JSON.stringify(hamsterOptions)}`
  );

  console.log('\n--- TEST GROUP 5: Display Formatter Consistency ---');
  const formattedTurtle = formatPetAgeDisplay({
    birthDate: turtle12Birth,
    species: 'turtle',
    approximateAge: null,
  });
  assert(
    formattedTurtle.includes('12 anos') && formattedTurtle.includes('Adulto jovem'),
    'formatPetAgeDisplay for 12yo Turtle returns "12 anos · Adulto jovem"',
    `result="${formattedTurtle}"`
  );

  console.log('\n--- TEST GROUP 6: Species Rules Non-Fallback & Isolation ---');
  const speciesList = [
    'dog',
    'cat',
    'rabbit',
    'hamster',
    'guinea_pig',
    'ferret',
    'rat',
    'cockatiel',
    'parrot',
    'parakeet',
    'canary',
    'lovebird',
    'turtle',
    'iguana',
    'gecko',
    'snake',
    'fish',
    'other',
  ];

  for (const sp of speciesList) {
    const rule = getSpeciesAgeRule(sp);
    assert(
      rule !== null && rule !== undefined,
      `Rule registered for species: ${sp}`,
      `Family: ${rule.family}`
    );
    if (sp !== 'dog') {
      assert(
        rule.speciesId !== 'dog' || sp === 'other',
        `Species ${sp} does not erroneously resolve to dog rule`,
        `Resolved speciesId: ${rule.speciesId}`
      );
    }
  }

  console.log('\n====================================================');
  console.log(`  QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runQATests()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
