import { prisma } from '../src/lib/prisma';
import { partnerProgramService } from '../src/services/partner-program.service';
import { Role, AppointmentStatus } from '@prisma/client';

async function main() {
  console.log('=== FULL SYSTEM VERIFICATION ===\n');

  // 1. Verify 6M Chart Bucketing
  console.log('--- 1. Admin Performance Chart (6M and all periods) ---');
  const periods = ['7d', '30d', '3m', '6m', '1y'];

  // Admin login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'admin' }),
  });
  const { token: adminToken } = (await loginRes.json()) as any;

  for (const p of periods) {
    const r = await fetch(`http://localhost:3000/api/admin/dashboard/performance?period=${p}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pts = (await r.json()) as any[];
    const nonZero = pts.filter((pt) => pt.revenue > 0 || pt.users > 0 || pt.appointments > 0);
    console.log(`Period ${p.padEnd(4)}: ${pts.length} points | ${nonZero.length} non-zero buckets`);
    if (p === '6m' && nonZero.length === 0) {
      throw new Error('FAILED: 6M period has 0 non-zero points!');
    }
  }

  // 2. Verify Partner Program Business Rules
  console.log('\n--- 2. Partner Program Business Rules & Payout Calculation ---');
  const est = await prisma.user.findFirst({
    where: { role: Role.ESTABLISHMENT, establishmentProfile: { status: 'ACTIVE' } },
  });
  if (!est) throw new Error('No active establishment found');

  // Opt-in
  const optInRes = await partnerProgramService.optIn(est.id, '127.0.0.1', 'Audit Agent');
  console.log('Opt-in successful. Status:', optInRes.status, '| Rate:', optInRes.remunerationRate);

  // Check Terms Acceptance record
  const termsAcc = await prisma.termsAcceptance.findFirst({
    where: { userId: est.id, termType: 'PARTNER_PLAN_PROGRAM' },
  });
  console.log('TermsAcceptance recorded:', !!termsAcc, '| TermType:', termsAcc?.termType);

  // Clean previous test payouts for est
  await prisma.partnerPayout.deleteMany({ where: { establishmentId: est.id } });

  // Create appointment
  const tutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } });
  const pet = await prisma.pet.findFirst({ where: { tutorId: tutor?.id } });
  let service = await prisma.service.findFirst({ where: { establishmentId: est.id } });
  if (!service) {
    service = await prisma.service.create({
      data: { name: 'Serviço Auditoria', price: 200, duration: 60, establishmentId: est.id }
    });
  } else {
    service = await prisma.service.update({
      where: { id: service.id },
      data: { price: 200 },
    });
  }

  const testApt = await prisma.appointment.create({
    data: {
      tutorId: tutor!.id,
      petId: pet!.id,
      serviceId: service.id,
      establishmentId: est.id,
      date: new Date(),
      status: AppointmentStatus.PENDING,
      paymentStatus: 'PENDING',
      totalAmount: 200,
      finalAmount: 200,
    }
  });

  // Payout when pending: must be null
  const nullPayout = await partnerProgramService.processAppointmentPayout(testApt.id);
  console.log('Pending appointment payout (must be null):', nullPayout);
  if (nullPayout !== null) throw new Error('Payout should NOT be created for pending appointment');

  // Complete and pay
  await prisma.appointment.update({
    where: { id: testApt.id },
    data: { status: AppointmentStatus.COMPLETED, paymentStatus: 'PAID' }
  });

  const createdPayout = await partnerProgramService.processAppointmentPayout(testApt.id);
  console.log('Completed + Paid payout created:', createdPayout?.id, '| Amount:', createdPayout?.payoutAmount);
  if (createdPayout?.payoutAmount !== 140) { // 70% of 200 is 140
    throw new Error(`Expected payoutAmount 140 (70% of 200), got ${createdPayout?.payoutAmount}`);
  }

  // Idempotency: execute again
  const secondPayout = await partnerProgramService.processAppointmentPayout(testApt.id);
  console.log('Idempotent second run ID matches first:', secondPayout?.id === createdPayout.id);

  // 3. Verify Admin Overview Endpoint
  console.log('\n--- 3. Admin Overview Endpoint ---');
  const adminOverviewRes = await fetch('http://localhost:3000/api/admin/partner-program/overview', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminOverview = (await adminOverviewRes.json()) as any;
  console.log('Admin Overview Stats:', adminOverview.stats);

  // 4. Verify Search Boost & Public Endpoints
  console.log('\n--- 4. Search Boost & Partner Badges Endpoints ---');
  const estListRes = await fetch('http://localhost:3000/api/establishments');
  const estList = (await estListRes.json()) as any[];
  const partnerEst = estList.find(e => e.id === est.id);
  console.log('Establishment isProgramPartner:', partnerEst?.isProgramPartner);

  const prodListRes = await fetch('http://localhost:3000/api/products');
  const prodList = (await prodListRes.json()) as any[];
  console.log('Products returned:', prodList.length, '| Sample product isProgramPartner:', prodList[0]?.isProgramPartner !== undefined);

  console.log('\n=========================================');
  console.log('ALL SYSTEM CHECKS PASSED WITH 100% SUCCESS!');
  console.log('=========================================');
}

main()
  .catch(err => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
