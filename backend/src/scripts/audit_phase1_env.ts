import { prisma } from '../lib/prisma';
import url from 'url';

async function main() {
  console.log('=== PHASE 1: ENVIRONMENT & DATABASE AUDIT ===');
  
  // 1. Inspect DB Connection URL safely (no credentials printed)
  const dbUrl = process.env.DATABASE_URL || '';
  try {
    const parsed = new URL(dbUrl);
    console.log(`Database Protocol: ${parsed.protocol}`);
    console.log(`Database Host: ${parsed.hostname}`);
    console.log(`Database Port: ${parsed.port}`);
    console.log(`Database Name: ${parsed.pathname.replace(/^\//, '')}`);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    console.log(`Is Local/Development: ${isLocal ? 'YES (Safe for presentation demo)' : 'NO / EXTERNAL'}`);
  } catch {
    console.log('Database URL format could not be parsed via URL object, checking localhost:');
    console.log(`Contains localhost: ${dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')}`);
  }

  // 2. Test DB query
  const userCount = await prisma.user.count();
  console.log(`Total existing users: ${userCount}`);

  // 3. Existing users by role (without passwords/tokens)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n--- Existing Users & Roles ---');
  for (const u of users) {
    console.log(`- [${u.role}] ${u.email} | Name: ${u.name} (ID: ${u.id})`);
  }

  // 4. Target establishment audit: pethub@gmail.com
  const pethubUser = await prisma.user.findUnique({
    where: { email: 'pethub@gmail.com' },
    include: {
      establishmentProfile: true,
      servicesAsEstablishment: true,
      productsAsEstablishment: true,
      employeesAsEstablishment: true,
    },
  });

  if (!pethubUser) {
    console.error('\n❌ Target user pethub@gmail.com NOT found!');
  } else {
    console.log('\n--- Target Account (pethub@gmail.com) ---');
    console.log(`User ID: ${pethubUser.id}`);
    console.log(`Business Name: ${pethubUser.establishmentProfile?.businessName || pethubUser.name}`);
    console.log(`Services Count: ${pethubUser.servicesAsEstablishment.length}`);
    console.log(`Products Count: ${pethubUser.productsAsEstablishment.length}`);
    console.log(`Employees Count: ${pethubUser.employeesAsEstablishment.length}`);
    
    console.log('Services Sample:');
    for (const s of pethubUser.servicesAsEstablishment.slice(0, 5)) {
      console.log(`  - ${s.name}: R$ ${s.price} (ID: ${s.id})`);
    }

    console.log('Products Sample:');
    for (const p of pethubUser.productsAsEstablishment.slice(0, 5)) {
      console.log(`  - ${p.name}: R$ ${p.price} | Stock: ${p.stock} (ID: ${p.id})`);
    }

    console.log('Employees Sample:');
    for (const e of pethubUser.employeesAsEstablishment.slice(0, 5)) {
      console.log(`  - ${e.name} | Role: ${e.role} (ID: ${e.id})`);
    }
  }

  // 5. Existing pets and tutors count
  const petsCount = await prisma.pet.count();
  const appointmentsCount = await prisma.appointment.count();
  const ordersCount = await prisma.order.count();
  console.log(`\nExisting Pets: ${petsCount} | Appointments: ${appointmentsCount} | Orders: ${ordersCount}`);
}

main()
  .catch((err) => {
    console.error('Phase 1 audit error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
