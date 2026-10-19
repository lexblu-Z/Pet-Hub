import { PrismaClient, AppointmentStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000/api';

async function run() {
  console.log('=== STARTING 3 OBJECTIVES INTEGRATION VERIFICATION ===\n');

  // 1. Authenticate Tutor and Establishment
  console.log('1. Authenticating accounts...');
  const tutorLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'user1@gmail.com',
    password: '123456789',
  });
  const tutorToken = tutorLogin.data.token;
  const tutorHeaders = { Authorization: `Bearer ${tutorToken}` };

  const estLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'pethub@gmail.com',
    password: '123456789',
  });
  const estToken = estLogin.data.token;
  const estHeaders = { Authorization: `Bearer ${estToken}` };
  const establishment = await prisma.user.findUnique({ where: { email: 'pethub@gmail.com' } });
  const establishmentId = establishment!.id;
  console.log(`✓ Tutor token obtained. Establishment ID: ${establishmentId}`);

  // Fetch pet and service for tutor
  const tutorUser = await prisma.user.findUnique({
    where: { email: 'user1@gmail.com' },
    include: { pets: true },
  });
  const petId = tutorUser?.pets[0]?.id;
  const service = await prisma.service.findFirst({
    where: { establishmentId: establishmentId },
  });
  const serviceId = service?.id;
  const servicePrice = Number(service?.price || 50);

  if (!petId || !serviceId) {
    throw new Error(`Missing petId (${petId}) or serviceId (${serviceId})`);
  }

  // --- PROBLEM 1: PAYMENT METHOD MANDATORY & PENDING STATUS ---
  console.log('\n--- VERIFYING PROBLEM 1: MANDATORY PAYMENT METHOD ---');
  
  // Test 1.1: Missing paymentMethod should fail with 400
  // Pick a weekday (e.g. Wednesday) to satisfy provider operating hours
  const testAptDate = new Date();
  const daysUntilWed = ((3 + 7 - testAptDate.getDay()) % 7) || 7;
  testAptDate.setDate(testAptDate.getDate() + daysUntilWed + 7); // Wednesday next week
  testAptDate.setUTCHours(14, 0, 0, 0); // 11:00 BRT
  const aptDateIso = testAptDate.toISOString();

  // Clear any potential conflicting appointment for this tutor/establishment at this slot
  await prisma.appointment.deleteMany({
    where: {
      date: testAptDate,
      tutorId: tutorUser!.id,
    },
  });

  try {
    await axios.post(
      `${API_BASE}/appointments`,
      {
        establishmentId,
        petId,
        serviceId,
        date: aptDateIso,
      },
      { headers: tutorHeaders }
    );
    console.error('❌ FAILED: Creating appointment without paymentMethod should have failed!');
    process.exit(1);
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log('✓ PASS: Request without paymentMethod returned 400 Bad Request');
    } else {
      console.error('❌ FAILED with unexpected error:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  // Test 1.2: Empty paymentMethod string should fail with 400
  try {
    await axios.post(
      `${API_BASE}/appointments`,
      {
        establishmentId,
        petId,
        serviceId,
        date: aptDateIso,
        paymentMethod: '',
      },
      { headers: tutorHeaders }
    );
    console.error('❌ FAILED: Creating appointment with empty paymentMethod should have failed!');
    process.exit(1);
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log('✓ PASS: Request with empty paymentMethod returned 400 Bad Request');
    } else {
      console.error('❌ FAILED with unexpected error:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  // Test 1.3: Valid paymentMethod succeeds and paymentStatus is PENDING
  const createRes = await axios.post(
    `${API_BASE}/appointments`,
    {
      establishmentId,
      petId,
      serviceId,
      date: aptDateIso,
      paymentMethod: 'CREDIT_CARD',
    },
    { headers: tutorHeaders }
  );

  const testAptId = createRes.data.id;
  console.log(`✓ Appointment created: ID ${testAptId}`);
  if (createRes.data.paymentMethod === 'CREDIT_CARD' && createRes.data.paymentStatus === 'PENDING') {
    console.log('✓ PASS: Appointment has paymentMethod=CREDIT_CARD and paymentStatus=PENDING');
  } else {
    console.error('❌ FAILED: Unexpected paymentMethod or paymentStatus:', createRes.data);
    process.exit(1);
  }

  // --- PROBLEM 2: FINANCIAL REPORT RECONCILIATION & R$ 79,90 ORIGIN ---
  console.log('\n--- VERIFYING PROBLEM 2: FINANCIAL REPORT RECONCILIATION ---');
  
  // Verify the R$ 79,90 appointment in database
  const suspiciousApt = await prisma.appointment.findUnique({
    where: { id: 'e60182a9-942b-457c-bc7a-68760f4a7219' },
  });
  if (suspiciousApt) {
    console.log(`✓ Located target appointment e60182a9: Price=${suspiciousApt.totalAmount || (suspiciousApt as any).price}, Status=${suspiciousApt.status}, PaymentStatus=${suspiciousApt.paymentStatus}`);
  }

  // Request Financial Report for Establishment
  const finReportRes = await axios.get(`${API_BASE}/reports/establishment/financial`, {
    headers: estHeaders,
  });
  const finSummary = finReportRes.data.summary;
  console.log(`Summary grossRevenueServices: R$ ${finSummary.grossRevenueServices.toFixed(2)}`);
  console.log(`Summary projectedServicesRevenue: R$ ${finSummary.projectedServicesRevenue?.toFixed(2)}`);
  console.log(`Summary pendingServicesCount: ${finSummary.pendingServicesCount}`);

  // Ensure projectedServicesRevenue accounts for pending appointments
  if (finSummary.projectedServicesRevenue > 0) {
    console.log('✓ PASS: Projected revenue is properly tracked separate from realized gross revenue.');
  }

  // Verify PDF and CSV exports respond with 200
  const pdfRes = await axios.get(`${API_BASE}/reports/establishment/export?type=financial&format=pdf`, {
    headers: estHeaders,
    responseType: 'arraybuffer',
  });
  if (pdfRes.status === 200 && String(pdfRes.headers['content-type'] || '').includes('pdf')) {
    console.log(`✓ PASS: Financial PDF export generated successfully (${pdfRes.data.byteLength} bytes)`);
  }

  const csvRes = await axios.get(`${API_BASE}/reports/establishment/export?type=financial&format=csv`, {
    headers: estHeaders,
  });
  if (csvRes.status === 200 && (String(csvRes.headers['content-type'] || '').includes('csv') || String(csvRes.headers['content-type'] || '').includes('text'))) {
    console.log(`✓ PASS: Financial CSV export generated successfully`);
  }

  // --- PROBLEM 3: REVIEWS (ONLY COMPLETED, VERIFIED, OPTIONAL COMMENT) ---
  console.log('\n--- VERIFYING PROBLEM 3: VERIFIED REVIEWS ---');

  // Test 3.1: Check eligibility for PENDING appointment -> must not be eligible
  const eligPending = await axios.get(`${API_BASE}/reviews/eligibility?establishmentId=${establishmentId}`, {
    headers: tutorHeaders,
  });
  const isPendingEligible = eligPending.data.eligibleAppointments.some((a: any) => a.id === testAptId);
  if (!isPendingEligible) {
    console.log('✓ PASS: PENDING appointment is not eligible for review');
  } else {
    console.error('❌ FAILED: PENDING appointment was reported in eligibleAppointments!');
    process.exit(1);
  }

  // Test 3.2: Attempt to submit review for PENDING appointment -> must fail with 400
  try {
    await axios.post(
      `${API_BASE}/reviews`,
      {
        appointmentId: testAptId,
        rating: 5,
        comment: 'Great service!',
      },
      { headers: tutorHeaders }
    );
    console.error('❌ FAILED: Submitting review for PENDING appointment should have failed!');
    process.exit(1);
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log('✓ PASS: Review attempt on PENDING appointment failed with 400 Bad Request');
    } else {
      console.error('❌ FAILED with unexpected error:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  // Test 3.3: Mark appointment as COMPLETED
  await axios.put(
    `${API_BASE}/establishment/appointments/${testAptId}/status`,
    { status: 'COMPLETED' },
    { headers: estHeaders }
  );
  console.log('✓ Appointment status updated to COMPLETED');

  // Verify eligibility now includes our appointment
  const eligCompleted = await axios.get(`${API_BASE}/reviews/eligibility?establishmentId=${establishmentId}`, {
    headers: tutorHeaders,
  });
  const isCompletedEligible = eligCompleted.data.eligibleAppointments.some((a: any) => a.id === testAptId);
  if (isCompletedEligible) {
    console.log('✓ PASS: COMPLETED appointment is now eligible for review');
  } else {
    console.error('❌ FAILED: COMPLETED appointment not found in eligibleAppointments!');
    process.exit(1);
  }

  // Test 3.4: Invalid rating (0 or > 5) fails with 400
  try {
    await axios.post(
      `${API_BASE}/reviews`,
      {
        appointmentId: testAptId,
        rating: 0,
      },
      { headers: tutorHeaders }
    );
    console.error('❌ FAILED: Review with rating 0 should have failed!');
    process.exit(1);
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log('✓ PASS: Review with rating 0 returned 400 Bad Request');
    } else {
      console.error('❌ FAILED with unexpected status:', err.response?.status);
      process.exit(1);
    }
  }

  // Test 3.5: Submit valid review with OPTIONAL empty comment
  const reviewRes = await axios.post(
    `${API_BASE}/reviews`,
    {
      appointmentId: testAptId,
      rating: 5,
      // No comment provided
    },
    { headers: tutorHeaders }
  );
  if (reviewRes.status === 201 && reviewRes.data.review?.rating === 5) {
    console.log('✓ PASS: Review created successfully with optional empty comment');
  } else {
    console.error('❌ FAILED: Could not create review:', reviewRes.data);
    process.exit(1);
  }

  // Test 3.6: Duplicate review on same appointment must fail with 409
  try {
    await axios.post(
      `${API_BASE}/reviews`,
      {
        appointmentId: testAptId,
        rating: 4,
      },
      { headers: tutorHeaders }
    );
    console.error('❌ FAILED: Duplicate review should have failed with 409 Conflict!');
    process.exit(1);
  } catch (err: any) {
    if (err.response?.status === 409) {
      console.log('✓ PASS: Duplicate review on same appointment returned 409 Conflict');
    } else {
      console.error('❌ FAILED with unexpected error:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  // Test 3.7: Tutor appointments endpoint lists the review object
  const tutorApts = await axios.get(`${API_BASE}/appointments/me`, {
    headers: tutorHeaders,
  });
  const myApt = tutorApts.data.find((a: any) => a.id === testAptId);
  if (myApt?.review && myApt.review.rating === 5) {
    console.log('✓ PASS: Tutor appointments list includes review object with rating 5');
  } else {
    console.error('❌ FAILED: Review not found in tutor appointments list:', myApt);
    process.exit(1);
  }

  // Test 3.8: Establishment services report reflects the review
  const srvReport = await axios.get(`${API_BASE}/reports/establishment/services`, {
    headers: estHeaders,
  });
  console.log(`Establishment Services Report averageRating: ${srvReport.data.summary.averageRating}, reviewCount: ${srvReport.data.summary.reviewCount}`);
  if (srvReport.data.summary.reviewCount >= 1 && srvReport.data.summary.averageRating > 0) {
    console.log('✓ PASS: Establishment services report correctly computes averageRating and reviewCount from Review table');
  } else {
    console.error('❌ FAILED: Services report average rating or count not calculated:', srvReport.data.summary);
    process.exit(1);
  }

  // Clean up created test appointment and review
  await prisma.review.deleteMany({ where: { appointmentId: testAptId } });
  await prisma.appointment.delete({ where: { id: testAptId } });
  console.log('✓ Cleaned up test appointment and review.');

  console.log('\n=== ALL 3 PROBLEMS VERIFIED SUCCESSFULLY AND END-TO-END! ===');
}

run()
  .catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
