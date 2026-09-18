import { prisma } from '../src/lib/prisma';
import { partnerProgramService } from '../src/services/partner-program.service';
import { AppointmentStatus, Role } from '@prisma/client';

async function runTests() {
  console.log('--- TEST: Voluntary Partner Program ---');

  // 1. Find or create an approved establishment
  let est = await prisma.user.findFirst({
    where: {
      role: Role.ESTABLISHMENT,
      establishmentProfile: { status: 'ACTIVE' },
    },
    include: { establishmentProfile: true },
  });

  if (!est) {
    console.log('No active establishment found. Creating test establishment...');
    est = await prisma.user.create({
      data: {
        name: 'Pet Shop Teste',
        email: `partner_test_${Date.now()}@pethub.com`,
        password: 'hash',
        role: Role.ESTABLISHMENT,
        establishmentProfile: {
          create: {
            businessName: 'Pet Shop Teste Ltda',
            status: 'ACTIVE',
          },
        },
      },
      include: { establishmentProfile: true },
    });
  }

  console.log(`Establishment: ${est.name} (ID: ${est.id})`);

  // Clean previous participation/payouts for clean state
  await prisma.partnerPayout.deleteMany({ where: { establishmentId: est.id } });
  await prisma.partnerProgramParticipation.deleteMany({ where: { establishmentId: est.id } });
  await prisma.termsAcceptance.deleteMany({ where: { userId: est.id, termType: 'PARTNER_PLAN_PROGRAM' } });

  // 2. Initial state: eligible, not enrolled
  const initial = await partnerProgramService.getParticipation(est.id);
  console.log('1. Initial participation state:', initial.status, '| Eligible:', initial.isEligible);
  if (initial.status !== 'NOT_ENROLLED' || !initial.isEligible) {
    throw new Error('Initial state should be NOT_ENROLLED and isEligible = true');
  }

  // 3. Opt-in
  const optInResult = await partnerProgramService.optIn(est.id, '127.0.0.1', 'Mozilla Test');
  console.log('2. Opt-in result:', optInResult.status, '| AcceptedAt:', optInResult.acceptedAt);
  if (optInResult.status !== 'ACTIVE' || !optInResult.acceptedAt) {
    throw new Error('Opt-in should set status ACTIVE and acceptedAt');
  }

  // Check TermsAcceptance
  const termsRecord = await prisma.termsAcceptance.findFirst({
    where: { userId: est.id, termType: 'PARTNER_PLAN_PROGRAM' },
  });
  console.log('3. TermsAcceptance persisted:', !!termsRecord, '| Version:', termsRecord?.version);
  if (!termsRecord || termsRecord.version !== '1.0') {
    throw new Error('TermsAcceptance must be persisted');
  }

  // 4. Create appointment to test payout calculation
  // Find a tutor and service
  let tutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } });
  let pet = await prisma.pet.findFirst({ where: { tutorId: tutor?.id } });
  let service = await prisma.service.findFirst({ where: { establishmentId: est.id } });

  if (!service) {
    service = await prisma.service.create({
      data: {
        name: 'Banho Especial Teste',
        price: 100.0,
        duration: 45,
        establishmentId: est.id,
      },
    });
  }

  if (!tutor) {
    tutor = await prisma.user.create({
      data: {
        name: 'Tutor Teste',
        email: `tutor_test_${Date.now()}@pethub.com`,
        password: 'hash',
        role: Role.TUTOR,
      },
    });
  }

  if (!pet) {
    pet = await prisma.pet.create({
      data: {
        name: 'Rex Teste',
        species: 'dog',
        tutorId: tutor.id,
      },
    });
  }

  const apt = await prisma.appointment.create({
    data: {
      tutorId: tutor.id,
      petId: pet.id,
      serviceId: service.id,
      establishmentId: est.id,
      date: new Date(),
      status: AppointmentStatus.PENDING,
      paymentStatus: 'PENDING',
      totalAmount: 100.0,
      finalAmount: 100.0,
    },
  });

  // Attempt payout when PENDING (must NOT create payout)
  const pendingPayout = await partnerProgramService.processAppointmentPayout(apt.id);
  console.log('4. Payout when PENDING:', pendingPayout);
  if (pendingPayout !== null) {
    throw new Error('Payout must NOT be generated for PENDING appointment');
  }

  // Update to COMPLETED and PAID
  await prisma.appointment.update({
    where: { id: apt.id },
    data: {
      status: AppointmentStatus.COMPLETED,
      paymentStatus: 'PAID',
    },
  });

  // Generate payout
  const paidPayout = await partnerProgramService.processAppointmentPayout(apt.id);
  console.log('5. Payout when COMPLETED + PAID:', paidPayout?.id, '| Amount:', paidPayout?.payoutAmount, '| Rate:', paidPayout?.remunerationRate);
  if (!paidPayout || paidPayout.payoutAmount !== 70.0 || paidPayout.remunerationRate !== 0.70) {
    throw new Error(`Expected payoutAmount 70.0 and rate 0.70, got ${paidPayout?.payoutAmount}`);
  }

  // Idempotency: try to process again
  const duplicatePayout = await partnerProgramService.processAppointmentPayout(apt.id);
  console.log('6. Idempotency test (same ID):', duplicatePayout?.id === paidPayout.id);
  const allPayouts = await prisma.partnerPayout.findMany({ where: { appointmentId: apt.id } });
  console.log('7. Total payouts for appointment in DB:', allPayouts.length);
  if (allPayouts.length !== 1) {
    throw new Error('Anti-duplication failed: multiple payouts found for one appointment');
  }

  // 8. Opt-out
  const optOutResult = await partnerProgramService.optOut(est.id);
  console.log('8. Opt-out status:', optOutResult.status, '| DeclinedAt:', optOutResult.declinedAt);
  if (optOutResult.status !== 'DECLINED') {
    throw new Error('Opt-out must set status DECLINED');
  }

  // 9. Admin overview
  const adminOverview = await partnerProgramService.getAdminOverview();
  console.log('9. Admin overview stats:', adminOverview.stats);

  console.log('✅ ALL PARTNER PROGRAM TESTS PASSED PERFECTLY!');
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
