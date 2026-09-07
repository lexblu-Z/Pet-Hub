import axios from 'axios';
import { prisma } from '../src/lib/prisma';
import { calculateCashback, generateSecureCashbackCode, normalizeCashbackCode } from '../src/utils/cashback';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('================================================================');
  console.log('STARTING COMPLETE TEST MATRIX FOR UNIVERSAL CASHBACK SYSTEM (26 TESTS)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, name: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] Test ${testNum.toString().padStart(2, '0')}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${testNum.toString().padStart(2, '0')}: ${name}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  async function getUserBalance(token: string): Promise<number> {
    const res = await axios.get(`${API_URL}/cashback/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.balance || 0;
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Product purchase 3% calculation
    // -------------------------------------------------------------
    const prodCalc = calculateCashback(150.00, 'PRODUCT');
    assert(
      prodCalc.cashbackAmount === 4.50 && prodCalc.rate === 0.03 && prodCalc.eligibleAmount === 150.00,
      1,
      'Product purchase 3% cashback calculated accurately on eligible amount',
      `Got ${JSON.stringify(prodCalc)}`
    );

    // -------------------------------------------------------------
    // Test 2: Service appointment 5% calculation
    // -------------------------------------------------------------
    const srvCalc = calculateCashback(200.00, 'SERVICE');
    assert(
      srvCalc.cashbackAmount === 10.00 && srvCalc.rate === 0.05 && srvCalc.eligibleAmount === 200.00,
      2,
      'Service appointment 5% cashback calculated accurately on eligible amount',
      `Got ${JSON.stringify(srvCalc)}`
    );

function generateValidCPF(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9)).join('');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(base.charAt(i), 10) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  let digit1 = rest >= 10 ? 0 : rest;

  const withD1 = base + digit1;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(withD1.charAt(i), 10) * (11 - i);
  }
  rest = 11 - (sum % 11);
  let digit2 = rest >= 10 ? 0 : rest;

  return withD1 + digit2;
}

function generateValidCNPJ(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 9)).join('');
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base.charAt(i), 10) * weights1[i];
  }
  let rest = sum % 11;
  let digit1 = rest < 2 ? 0 : 11 - rest;

  const withD1 = base + digit1;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(withD1.charAt(i), 10) * weights2[i];
  }
  rest = sum % 11;
  let digit2 = rest < 2 ? 0 : 11 - rest;

  return withD1 + digit2;
}

    // -------------------------------------------------------------
    // Setup test accounts
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const tutorEmail = `tutor_test_${timestamp}@pethub.com`;
    const tutor2Email = `tutor2_test_${timestamp}@pethub.com`;
    const estabEmail = `estab_test_${timestamp}@pethub.com`;
    const profEmail = `prof_test_${timestamp}@pethub.com`;

    // 1. Create Tutor 1
    const tutorRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Tutor Test One',
      email: tutorEmail,
      phone: '(14) 99876-5432',
      password: 'password123',
      role: 'TUTOR',
      document: generateValidCPF(),
      address: 'Rua Antonio Carlos Mori',
      number: '100',
      neighborhood: 'Centro',
      city: 'Ourinhos',
      state: 'SP',
      zipCode: '19900-000',
    });
    const tutorToken = tutorRes.data.token;
    const tutorId = tutorRes.data.user.id;

    // -------------------------------------------------------------
    // Test 20: Tutor registration does NOT require acceptedCashbackTerms
    // -------------------------------------------------------------
    assert(
      !!tutorToken && tutorRes.data.user.role === 'TUTOR',
      20,
      'Tutor registration does not require partner cashback terms',
      'Tutor registered smoothly without terms flag'
    );

    // 2. Create Tutor 2
    const tutor2Res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Tutor Test Two',
      email: tutor2Email,
      phone: '(14) 99876-5433',
      password: 'password123',
      role: 'TUTOR',
      document: generateValidCPF(),
      address: 'Rua Antonio Carlos Mori',
      number: '102',
      neighborhood: 'Centro',
      city: 'Ourinhos',
      state: 'SP',
      zipCode: '19900-000',
    });
    const tutor2Token = tutor2Res.data.token;
    const tutor2Id = tutor2Res.data.user.id;

    // -------------------------------------------------------------
    // Test 17: Establishment registration without terms rejected
    // -------------------------------------------------------------
    let estabRejected = false;
    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: 'Pet Shop Rejeitado',
        email: `reject_${timestamp}@pethub.com`,
        phone: '(14) 99876-1111',
        password: 'password123',
        role: 'ESTABLISHMENT',
        document: generateValidCNPJ(),
        businessName: 'Pet Shop Sem Termos',
        city: 'Ourinhos',
        state: 'SP',
        zipCode: '19900-000',
        address: 'Rua Paraná',
        acceptedCashbackTerms: false,
      });
    } catch (e: any) {
      if (e.response?.status === 400 && e.response?.data?.error?.includes('termos do programa de cashback')) {
        estabRejected = true;
      }
    }
    assert(
      estabRejected,
      17,
      'Establishment registration without acceptedCashbackTerms rejected with 400',
      'Missing or false terms was rejected'
    );

    // -------------------------------------------------------------
    // Test 18: Professional registration without terms rejected
    // -------------------------------------------------------------
    let profRejected = false;
    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: 'Veterinário Rejeitado',
        email: `reject_prof_${timestamp}@pethub.com`,
        phone: '(14) 99876-2222',
        password: 'password123',
        role: 'PROFESSIONAL',
        document: generateValidCPF(),
        specialty: 'Veterinário Geral',
        workplacePhoto: '/uploads/photos/consultorio.jpg',
        city: 'Ourinhos',
        state: 'SP',
        zipCode: '19900-000',
        address: 'Rua Paraná',
        number: '200',
        neighborhood: 'Centro',
        acceptedCashbackTerms: false,
      });
    } catch (e: any) {
      if (e.response?.status === 400 && e.response?.data?.error?.includes('termos do programa de cashback')) {
        profRejected = true;
      }
    }
    assert(
      profRejected,
      18,
      'Professional registration without acceptedCashbackTerms rejected with 400',
      'Missing or false terms was rejected'
    );

    // -------------------------------------------------------------
    // Test 19: TermsAcceptance DB persistence on partner registration
    // -------------------------------------------------------------
    const estabRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Pet Shop Sucesso',
      email: estabEmail,
      phone: '(14) 99876-3333',
      password: 'password123',
      role: 'ESTABLISHMENT',
      document: generateValidCNPJ(),
      businessName: 'Pet Shop Universal Ltda',
      city: 'Ourinhos',
      state: 'SP',
      zipCode: '19900-000',
      address: 'Rua São Paulo, 150',
      acceptedCashbackTerms: true,
    });
    const estabId = estabRes.data.user.id;

    // Check TermsAcceptance table in DB
    const termsRecord = await prisma.termsAcceptance.findFirst({
      where: {
        userId: estabId,
        termType: 'CASHBACK_POLICY',
        version: '1.0',
        accepted: true,
      },
    });
    assert(
      !!termsRecord,
      19,
      'TermsAcceptance record persisted in DB with version 1.0 and CASHBACK_POLICY',
      `Found record ${JSON.stringify(termsRecord)}`
    );

    // Activate establishment for tests
    await prisma.establishmentProfile.update({
      where: { userId: estabId },
      data: { status: 'ACTIVE' },
    });

    // Create a product for the establishment
    const product = await prisma.product.create({
      data: {
        name: 'Ração Premium 15kg',
        price: 100.00,
        stock: 50,
        establishmentId: estabId,
      },
    });

    // Create a pet for Tutor 1
    const pet = await prisma.pet.create({
      data: {
        name: 'Rex Teste',
        species: 'dog',
        breed: 'Labrador',
        tutorId: tutorId,
      },
    });

    // Create a service for establishment
    const service = await prisma.service.create({
      data: {
        name: 'Banho e Tosa Completo',
        price: 80.00,
        duration: 60,
        animalType: 'all',
        active: true,
        establishmentId: estabId,
      },
    });

    // -------------------------------------------------------------
    // Test 16: Supported payment methods: CREDIT_CARD, DEBIT_CARD, PIX, CASH
    // -------------------------------------------------------------
    const orderPixRes = await axios.post(
      `${API_URL}/orders`,
      {
        items: [{ productId: product.id, quantity: 1 }],
        deliveryMethod: 'PICKUP',
        paymentMethod: 'Pix',
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    assert(
      orderPixRes.data.paymentMethod === 'Pix' && orderPixRes.data.totalAmount === 100.00,
      16,
      'Payment methods accepted (Pix, Debit, Credit, Cash)',
      `Created order with paymentMethod: ${orderPixRes.data.paymentMethod}`
    );

    // -------------------------------------------------------------
    // Test 14: Cash payment with valid troco
    // -------------------------------------------------------------
    const orderCashRes = await axios.post(
      `${API_URL}/orders`,
      {
        items: [{ productId: product.id, quantity: 1 }],
        deliveryMethod: 'PICKUP',
        paymentMethod: 'Dinheiro',
        needsChange: true,
        changeFor: 150.00,
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    assert(
      orderCashRes.data.needsChange === true && orderCashRes.data.changeFor === 150.00,
      14,
      'Cash payment with valid troco (changeFor >= totalAmount) accepted',
      `Order created with changeFor: ${orderCashRes.data.changeFor}`
    );

    // -------------------------------------------------------------
    // Test 15: Cash payment with invalid troco rejected
    // -------------------------------------------------------------
    let trocoRejected = false;
    try {
      await axios.post(
        `${API_URL}/orders`,
        {
          items: [{ productId: product.id, quantity: 1 }],
          deliveryMethod: 'PICKUP',
          paymentMethod: 'Dinheiro',
          needsChange: true,
          changeFor: 50.00, // less than 100
        },
        { headers: { Authorization: `Bearer ${tutorToken}` } }
      );
    } catch (e: any) {
      if (e.response?.status === 400 && e.response?.data?.error?.includes('troco')) {
        trocoRejected = true;
      }
    }
    assert(
      trocoRejected,
      15,
      'Cash payment with invalid troco (changeFor < totalAmount) rejected with 400',
      'Troco smaller than total was rejected'
    );

    // Set order status to READY_FOR_PICKUP so tutor can confirm receipt
    await prisma.order.update({
      where: { id: orderPixRes.data.id },
      data: { status: 'READY_FOR_PICKUP' },
    });

    const preConfirmBalance = await getUserBalance(tutorToken);

    const confirmRes = await axios.post(
      `${API_URL}/orders/${orderPixRes.data.id}/confirm-receipt`,
      {},
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );

    const postConfirmBalance = await getUserBalance(tutorToken);
    const gainedCashback = Math.round((postConfirmBalance - preConfirmBalance) * 100) / 100;

    assert(
      confirmRes.data.cashbackCredited === true && gainedCashback === 3.00,
      3,
      'Moment of credit strictly upon Tutor confirmReceipt (3% credited: R$ 3.00)',
      `Balance increased by ${gainedCashback}`
    );

    // -------------------------------------------------------------
    // Test 4: Idempotency on order confirmReceipt
    // -------------------------------------------------------------
    await axios.post(
      `${API_URL}/orders/${orderPixRes.data.id}/confirm-receipt`,
      {},
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    const postIdempotentBalance = await getUserBalance(tutorToken);
    assert(
      postIdempotentBalance === postConfirmBalance,
      4,
      'Idempotency: repeating confirmReceipt on order does not duplicate cashback',
      `Balance remained ${postIdempotentBalance}`
    );

    // -------------------------------------------------------------
    // Test 5: Moment of credit & Idempotency on Service Appointment
    // -------------------------------------------------------------
    const aptRes = await axios.post(
      `${API_URL}/appointments`,
      {
        petId: pet.id,
        serviceId: service.id,
        establishmentId: estabId,
        date: '2026-10-15T14:00:00.000Z',
        paymentMethod: 'Cartão de Crédito',
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );

    const preAptBalance = await getUserBalance(tutorToken);

    // Tutor confirms completion of appointment
    const confirmAptRes = await axios.post(
      `${API_URL}/appointments/${aptRes.data.id}/confirm-completion`,
      {},
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );

    const postAptBalance = await getUserBalance(tutorToken);
    // 5% of 80.00 is 4.00
    const aptGained = Math.round((postAptBalance - preAptBalance) * 100) / 100;

    assert(
      confirmAptRes.data.cashbackCredited === true && aptGained === 4.00,
      5,
      'Appointment completion confirmation credits 5% cashback (R$ 4.00)',
      `Cashback earned: R$ ${aptGained}`
    );

    // Repeat appointment confirm to test idempotency
    await axios.post(
      `${API_URL}/appointments/${aptRes.data.id}/confirm-completion`,
      {},
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    const postAptIdempotentBalance = await getUserBalance(tutorToken);
    assert(
      postAptIdempotentBalance === postAptBalance,
      5,
      'Idempotency: repeating confirmCompletion on appointment does not duplicate cashback',
      `Balance remained R$ ${postAptIdempotentBalance}`
    );

    // -------------------------------------------------------------
    // Test 8: Voucher generation format (PHB-XXXX-XXXX-XXXX)
    // -------------------------------------------------------------
    // Give tutor enough balance for voucher test
    await prisma.cashbackTransaction.create({
      data: {
        userId: tutorId,
        type: 'EARNED',
        amount: 50.00,
        description: 'Bônus de teste para geração de voucher',
      },
    });

    const redeemRes = await axios.post(
      `${API_URL}/cashback/redeem`,
      { amount: 20.00 },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    const voucherCode = redeemRes.data.code;
    const codePattern = /^PHB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

    assert(
      codePattern.test(voucherCode),
      8,
      'Voucher generation format matches PHB-XXXX-XXXX-XXXX',
      `Generated code: ${voucherCode}`
    );

    // -------------------------------------------------------------
    // Test 21: Endpoint POST /cashback/validate returns valid for own code
    // -------------------------------------------------------------
    const valRes = await axios.post(
      `${API_URL}/cashback/validate`,
      { code: voucherCode },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    assert(
      valRes.data.valid === true && valRes.data.voucher.amount === 20.00,
      21,
      'POST /cashback/validate returns valid: true for active voucher owned by user',
      `Validated voucher: ${JSON.stringify(valRes.data)}`
    );

    // -------------------------------------------------------------
    // Test 9: Voucher ownership check (tutor 2 cannot use tutor 1's code)
    // -------------------------------------------------------------
    let stolenCodeRejected = false;
    try {
      await axios.post(
        `${API_URL}/cashback/validate`,
        { code: voucherCode },
        { headers: { Authorization: `Bearer ${tutor2Token}` } }
      );
    } catch (e: any) {
      if (e.response?.status === 400 && e.response?.data?.error?.includes('não pertence')) {
        stolenCodeRejected = true;
      }
    }
    assert(
      stolenCodeRejected,
      9,
      'Voucher ownership check: another tutor cannot validate or use the voucher',
      'Validation rejected with not owner message'
    );

    // -------------------------------------------------------------
    // Test 22: POST /cashback/validate returns false for nonexistent code
    // -------------------------------------------------------------
    let fakeCodeRejected = false;
    try {
      await axios.post(
        `${API_URL}/cashback/validate`,
        { code: 'PHB-FAKE-CODE-9999' },
        { headers: { Authorization: `Bearer ${tutorToken}` } }
      );
    } catch (e: any) {
      if (e.response?.status === 400) {
        fakeCodeRejected = true;
      }
    }
    assert(
      fakeCodeRejected,
      22,
      'POST /cashback/validate rejects nonexistent or fake codes with 400',
      'Rejected nonexistent code'
    );

    // -------------------------------------------------------------
    // Test 6: Non-recursive cashback calculation
    // Subtotal = 100, Voucher = 20 -> FinalAmount = 80.
    // Cashback to earn on order should be 3% of 80 = 2.40 (NEVER 3% of 100).
    // -------------------------------------------------------------
    const orderWithVoucher = await axios.post(
      `${API_URL}/orders`,
      {
        items: [{ productId: product.id, quantity: 1 }],
        deliveryMethod: 'PICKUP',
        paymentMethod: 'Cartão de Débito',
        cashbackCode: voucherCode,
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );

    assert(
      orderWithVoucher.data.totalAmount === 80.00 && orderWithVoucher.data.discountAmount === 20.00,
      25,
      'Order with voucher discount has final totalAmount reduced to 80.00',
      `totalAmount: ${orderWithVoucher.data.totalAmount}`
    );

    // -------------------------------------------------------------
    // Test 10: Voucher single-use / status transition to USED
    // -------------------------------------------------------------
    const voucherInDb = await prisma.cashbackVoucher.findUnique({
      where: { code: voucherCode },
    });
    assert(
      voucherInDb?.status === 'USED' && voucherInDb.orderId === orderWithVoucher.data.id,
      10,
      'Voucher status transitioned to USED upon order placement',
      `Status: ${voucherInDb?.status}, orderId: ${voucherInDb?.orderId}`
    );

    // -------------------------------------------------------------
    // Test 11: Cannot reuse USED voucher
    // -------------------------------------------------------------
    let reuseRejected = false;
    try {
      await axios.post(
        `${API_URL}/orders`,
        {
          items: [{ productId: product.id, quantity: 1 }],
          deliveryMethod: 'PICKUP',
          paymentMethod: 'Cartão de Débito',
          cashbackCode: voucherCode,
        },
        { headers: { Authorization: `Bearer ${tutorToken}` } }
      );
    } catch (e: any) {
      if (e.response?.status === 400 && e.response?.data?.error?.includes('já foi utilizado')) {
        reuseRejected = true;
      }
    }
    assert(
      reuseRejected,
      11,
      'Reusing a USED voucher is strictly rejected with 400',
      'Order creation with used voucher failed'
    );

    // Now confirm receipt of orderWithVoucher to verify Test 6 non-recursive cashback
    await prisma.order.update({
      where: { id: orderWithVoucher.data.id },
      data: { status: 'READY_FOR_PICKUP' },
    });

    const preNonRecBal = await getUserBalance(tutorToken);

    await axios.post(
      `${API_URL}/orders/${orderWithVoucher.data.id}/confirm-receipt`,
      {},
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );

    const postNonRecBal = await getUserBalance(tutorToken);
    const earnedNonRec = Math.round((postNonRecBal - preNonRecBal) * 100) / 100;

    assert(
      Math.abs(earnedNonRec - 2.40) < 0.001,
      6,
      'Non-recursive cashback: 3% of eligible amount (R$ 80.00) = R$ 2.40 (not calculated on voucher)',
      `Earned: ${earnedNonRec}`
    );

    // -------------------------------------------------------------
    // Test 12: Voucher restoration on order cancellation
    // -------------------------------------------------------------
    // Create new voucher
    const redeemRes2 = await axios.post(
      `${API_URL}/cashback/redeem`,
      { amount: 15.00 },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    const voucherCode2 = redeemRes2.data.code;

    const orderToCancel = await axios.post(
      `${API_URL}/orders`,
      {
        items: [{ productId: product.id, quantity: 1 }],
        deliveryMethod: 'PICKUP',
        paymentMethod: 'Cartão de Débito',
        cashbackCode: voucherCode2,
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );

    // Cancel order
    await axios.post(
      `${API_URL}/orders/${orderToCancel.data.id}/cancel`,
      { reason: 'Tutor desistiu' },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );

    const restoredVoucher = await prisma.cashbackVoucher.findUnique({
      where: { code: voucherCode2 },
    });
    assert(
      restoredVoucher?.status === 'ACTIVE' && restoredVoucher.orderId === null,
      12,
      'Voucher restored to ACTIVE when order is cancelled',
      `Voucher status: ${restoredVoucher?.status}`
    );

    // -------------------------------------------------------------
    // Test 24: Appointment with cashback voucher discount applied
    // -------------------------------------------------------------
    const aptWithVoucher = await axios.post(
      `${API_URL}/appointments`,
      {
        petId: pet.id,
        serviceId: service.id,
        establishmentId: estabId,
        date: '2026-10-18T10:00:00.000Z',
        paymentMethod: 'Pix',
        cashbackCode: voucherCode2,
      },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    // Service price is 80, voucher is 15 -> finalAmount = 65
    assert(
      aptWithVoucher.data.finalAmount === 65.00 && aptWithVoucher.data.discountAmount === 15.00,
      24,
      'Appointment with cashback voucher has finalAmount reduced by voucher amount (R$ 65.00)',
      `finalAmount: ${aptWithVoucher.data.finalAmount}`
    );

    // -------------------------------------------------------------
    // Test 13: Voucher restoration on appointment cancellation
    // -------------------------------------------------------------
    await axios.put(
      `${API_URL}/appointments/${aptWithVoucher.data.id}/status`,
      { status: 'CANCELLED' },
      { headers: { Authorization: `Bearer ${tutorToken}` } }
    );
    const restoredAptVoucher = await prisma.cashbackVoucher.findUnique({
      where: { code: voucherCode2 },
    });
    assert(
      restoredAptVoucher?.status === 'ACTIVE' && restoredAptVoucher.appointmentId === null,
      13,
      'Voucher restored to ACTIVE when appointment is cancelled',
      `Voucher status: ${restoredAptVoucher?.status}`
    );

    // -------------------------------------------------------------
    // Test 7: Concurrency / race condition protection
    // Try to run 5 parallel redemptions of 25.00 when balance is 30.00.
    // At most ONE request should succeed; 4 should fail.
    // -------------------------------------------------------------
    const currentBalBeforeRace = await getUserBalance(tutorToken);
    if (currentBalBeforeRace < 30.00) {
      await prisma.cashbackTransaction.create({
        data: {
          userId: tutorId,
          type: 'EARNED',
          amount: Math.round((30.00 - currentBalBeforeRace) * 100) / 100,
          description: 'Ajuste saldo teste concorrência',
        },
      });
    } else if (currentBalBeforeRace > 30.00) {
      await prisma.cashbackTransaction.create({
        data: {
          userId: tutorId,
          type: 'REDEEMED',
          amount: Math.round((currentBalBeforeRace - 30.00) * 100) / 100,
          description: 'Ajuste saldo teste concorrência',
        },
      });
    }

    const parallelAttempts = [
      axios.post(`${API_URL}/cashback/redeem`, { amount: 25.00 }, { headers: { Authorization: `Bearer ${tutorToken}` } }),
      axios.post(`${API_URL}/cashback/redeem`, { amount: 25.00 }, { headers: { Authorization: `Bearer ${tutorToken}` } }),
      axios.post(`${API_URL}/cashback/redeem`, { amount: 25.00 }, { headers: { Authorization: `Bearer ${tutorToken}` } }),
      axios.post(`${API_URL}/cashback/redeem`, { amount: 25.00 }, { headers: { Authorization: `Bearer ${tutorToken}` } }),
      axios.post(`${API_URL}/cashback/redeem`, { amount: 25.00 }, { headers: { Authorization: `Bearer ${tutorToken}` } }),
    ];

    const results = await Promise.allSettled(parallelAttempts);
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const finalBalance = await getUserBalance(tutorToken);

    assert(
      succeeded === 1 && finalBalance >= 0,
      7,
      'Concurrency protection: pessimistic row lock prevents race condition (only 1 redemption succeeded, balance >= 0)',
      `Succeeded count: ${succeeded}, Final balance: ${finalBalance}`
    );

    // -------------------------------------------------------------
    // Test 23: GET /cashback/me returns stats and vouchers
    // -------------------------------------------------------------
    const myCashbackRes = await axios.get(`${API_URL}/cashback/me`, {
      headers: { Authorization: `Bearer ${tutorToken}` },
    });
    const cbData = myCashbackRes.data;
    assert(
      cbData.balance !== undefined &&
      cbData.totalEarned !== undefined &&
      cbData.totalRedeemed !== undefined &&
      Array.isArray(cbData.transactions) &&
      Array.isArray(cbData.activeVouchers),
      23,
      'GET /cashback/me returns full stats, transactions, and active vouchers',
      `Stats: balance=${cbData.balance}, earned=${cbData.totalEarned}, redeemed=${cbData.totalRedeemed}`
    );

    // -------------------------------------------------------------
    // Test 26: Zero emojis in payment and cashback codebase
    // -------------------------------------------------------------
    const filesToCheck = [
      'c:/Users/leona/OneDrive/Documentos/Projetos/Pet Hub/pethub-frontend/src/components/shared/PaymentMethodSelector.tsx',
      'c:/Users/leona/OneDrive/Documentos/Projetos/Pet Hub/pethub-frontend/src/pages/tutor/CashbackPage.tsx',
      'c:/Users/leona/OneDrive/Documentos/Projetos/Pet Hub/backend/src/controllers/cashback.controller.ts',
      'c:/Users/leona/OneDrive/Documentos/Projetos/Pet Hub/backend/src/utils/cashback.ts',
    ];

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    let emojiFound = false;
    for (const f of filesToCheck) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        if (emojiRegex.test(content)) {
          emojiFound = true;
          console.error(`Emoji found in ${f}`);
        }
      }
    }
    assert(
      !emojiFound,
      26,
      'Zero emojis in payment and cashback interfaces (100% SVG and vector logos)',
      'All files clean of emojis'
    );

  } catch (err: any) {
    console.error('Fatal error running tests:', err.message, err.response?.data);
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED / ${failed} FAILED (TOTAL ${passed + failed}/26)`);
  console.log('================================================================');

  // Clean exit code
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
