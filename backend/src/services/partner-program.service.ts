import { prisma } from '../lib/prisma.js';
import { AppointmentStatus } from '@prisma/client';
import { createAndEmitNotification } from '../utils/notificationEvents.js';

export const partnerProgramService = {
  /**
   * Retorna os dados de participação do estabelecimento no programa de planos.
   * Apenas estabelecimentos com cadastro aprovado (ACTIVE) são elegíveis.
   */
  async getParticipation(establishmentId: string) {
    const user = await prisma.user.findUnique({
      where: { id: establishmentId },
      include: {
        establishmentProfile: true,
        partnerProgramParticipation: true,
      },
    });

    if (!user || user.role !== 'ESTABLISHMENT') {
      return {
        isEligible: false,
        reason: 'Usuário não é um estabelecimento cadastrado.',
      };
    }

    const isApproved = user.establishmentProfile?.status === 'ACTIVE';
    if (!isApproved) {
      return {
        isEligible: false,
        status: 'INELIGIBLE',
        reason: 'O cadastro do estabelecimento precisa estar aprovado pelo administrador antes da adesão ao programa de planos.',
      };
    }

    const participation = user.partnerProgramParticipation;
    if (!participation) {
      return {
        isEligible: true,
        status: 'NOT_ENROLLED',
        remunerationRate: 0.70,
        termsVersion: '1.0',
        termsTitle: 'Termo de Adesão ao Programa de Credenciamento e Fidelidade PetHub',
        termsContent: `
Ao aderir voluntariamente ao Programa de Parceiros PetHub, o Estabelecimento concorda com os seguintes termos:
1. A adesão é 100% voluntária e não condiciona a utilização dos demais recursos da plataforma.
2. O estabelecimento credenciado aceita prestar atendimentos a tutores assinantes dos planos de fidelidade PetHub.
3. O PetHub repassará 70% (setenta por cento) do valor de tabela cadastrado do serviço elegível executado.
4. O repasse financeiro é gerado exclusivamente após a conclusão do atendimento com status REALIZADO (COMPLETED) e confirmação de pagamento liquidado.
5. Os repasses são consolidados mensalmente para quitação conforme o calendário de pagamentos da plataforma.
6. O estabelecimento parceiro ganha destaque prioritário nos resultados de busca de serviços e vitrine de produtos.
7. O estabelecimento pode solicitar a desativação de sua participação no programa a qualquer momento, sem ônus residual.
        `.trim(),
      };
    }

    return {
      isEligible: true,
      id: participation.id,
      status: participation.status, // 'ACTIVE' | 'DECLINED' | 'SUSPENDED' | 'PENDING'
      termsVersion: participation.termsVersion,
      acceptedAt: participation.acceptedAt,
      declinedAt: participation.declinedAt,
      suspendedAt: participation.suspendedAt,
      remunerationRate: participation.remunerationRate,
      notes: participation.notes,
    };
  },

  /**
   * Adesão voluntária aos termos do programa (Opt-in).
   */
  async optIn(establishmentId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: establishmentId },
      include: { establishmentProfile: true },
    });

    if (!user || user.role !== 'ESTABLISHMENT') {
      throw new Error('Usuário não é um estabelecimento.');
    }

    if (user.establishmentProfile?.status !== 'ACTIVE') {
      throw new Error('Apenas estabelecimentos com cadastro aprovado podem aderir ao programa.');
    }

    const now = new Date();
    const version = '1.0';

    return await prisma.$transaction(async (tx) => {
      // 1. Gravar registro em TermsAcceptance para auditoria jurídica e compliance
      await tx.termsAcceptance.upsert({
        where: {
          userId_termType_version: {
            userId: establishmentId,
            termType: 'PARTNER_PLAN_PROGRAM',
            version: version,
          },
        },
        update: {
          accepted: true,
          acceptedAt: now,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
        create: {
          userId: establishmentId,
          termType: 'PARTNER_PLAN_PROGRAM',
          version: version,
          accepted: true,
          acceptedAt: now,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      // 2. Atualizar ou criar status da participação
      const participation = await tx.partnerProgramParticipation.upsert({
        where: { establishmentId },
        update: {
          status: 'ACTIVE',
          termsVersion: version,
          acceptedAt: now,
          declinedAt: null,
          suspendedAt: null,
          remunerationRate: 0.70,
        },
        create: {
          establishmentId,
          status: 'ACTIVE',
          termsVersion: version,
          acceptedAt: now,
          remunerationRate: 0.70,
        },
      });

      return participation;
    });
  },

  /**
   * Recusa ou desativação voluntária do programa (Opt-out).
   */
  async optOut(establishmentId: string) {
    const existing = await prisma.partnerProgramParticipation.findUnique({
      where: { establishmentId },
    });

    if (!existing) {
      return await prisma.partnerProgramParticipation.create({
        data: {
          establishmentId,
          status: 'DECLINED',
          termsVersion: '1.0',
          declinedAt: new Date(),
        },
      });
    }

    return await prisma.partnerProgramParticipation.update({
      where: { establishmentId },
      data: {
        status: 'DECLINED',
        declinedAt: new Date(),
      },
    });
  },

  /**
   * Extrato de repasses para o estabelecimento participante.
   */
  async getPayouts(establishmentId: string) {
    const payouts = await prisma.partnerPayout.findMany({
      where: { establishmentId },
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            pet: { select: { name: true, species: true } },
            tutor: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCalculated = payouts
      .filter((p) => p.status === 'CALCULATED')
      .reduce((acc, p) => acc + p.payoutAmount, 0);

    const totalApproved = payouts
      .filter((p) => p.status === 'APPROVED')
      .reduce((acc, p) => acc + p.payoutAmount, 0);

    const totalPaid = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((acc, p) => acc + p.payoutAmount, 0);

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const currentPeriodPending = payouts
      .filter((p) => p.periodMonth === currentPeriod && p.status !== 'PAID')
      .reduce((acc, p) => acc + p.payoutAmount, 0);

    return {
      payouts,
      summary: {
        totalCalculated: Number(totalCalculated.toFixed(2)),
        totalApproved: Number(totalApproved.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        currentPeriodPending: Number(currentPeriodPending.toFixed(2)),
        totalCount: payouts.length,
      },
    };
  },

  /**
   * Processa e gera o repasse para um agendamento de forma IDEMPOTENTE.
   * Regra estrita: Somente gera repasse se:
   * 1. Estabelecimento possui adesão ATIVA ao programa.
   * 2. Agendamento está COMPLETED e com pagamento liquidado (PAID).
   * 3. Repasse para este agendamento ainda não existe (anti-duplicação garantida por constraint no banco).
   */
  async processAppointmentPayout(appointmentId: string, clientTx?: any) {
    const db = clientTx || prisma;

    const apt = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        establishment: {
          include: {
            partnerProgramParticipation: true,
          },
        },
      },
    });

    if (!apt) return null;

    // Verificar se o estabelecimento é participante ativo
    const participation = apt.establishment?.partnerProgramParticipation;
    if (!participation || participation.status !== 'ACTIVE') {
      return null;
    }

    // Condição financeira crítica: status COMPLETED e pagamento confirmado/liquidado
    const isCompleted = apt.status === AppointmentStatus.COMPLETED;
    const isPaid = apt.paymentStatus === 'PAID';

    if (!isCompleted || !isPaid) {
      return null;
    }

    // Verificar idempotência contábil (anti-duplicação)
    const existingPayout = await db.partnerPayout.findUnique({
      where: { appointmentId: apt.id },
    });

    if (existingPayout) {
      return existingPayout;
    }

    const servicePrice = apt.service?.price || apt.totalAmount || 0;
    const remunerationRate = participation.remunerationRate || 0.70;
    const payoutAmount = Number((servicePrice * remunerationRate).toFixed(2));
    const periodMonth = new Date().toISOString().slice(0, 7);

    const payout = await db.partnerPayout.create({
      data: {
        establishmentId: apt.establishmentId,
        appointmentId: apt.id,
        serviceId: apt.serviceId,
        serviceName: apt.service?.name || 'Serviço do Programa',
        servicePrice: Number(servicePrice.toFixed(2)),
        remunerationRate,
        payoutAmount,
        status: 'CALCULATED',
        periodMonth,
      },
    });

    // Notificar estabelecimento sobre o repasse calculado
    createAndEmitNotification({
      userId: apt.establishmentId,
      title: 'Repasse de parceiro gerado',
      message: `Novo repasse de R$ ${payoutAmount.toFixed(2)} calculado referente a atendimento de parceiro.`,
      type: 'SYSTEM',
    }).catch(() => {});

    return payout;
  },

  /**
   * Visão Geral para o Painel Administrativo.
   */
  async getAdminOverview() {
    const participations = await prisma.partnerProgramParticipation.findMany({
      include: {
        establishment: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            establishmentProfile: {
              select: {
                businessName: true,
                status: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const payouts = await prisma.partnerPayout.findMany({
      include: {
        establishment: {
          select: {
            name: true,
            establishmentProfile: {
              select: { businessName: true },
            },
          },
        },
        appointment: {
          select: {
            date: true,
            pet: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = participations.filter((p) => p.status === 'ACTIVE').length;
    const declinedCount = participations.filter((p) => p.status === 'DECLINED').length;
    const pendingCount = participations.filter((p) => p.status === 'PENDING').length;

    const totalCalculated = payouts
      .filter((p) => p.status === 'CALCULATED')
      .reduce((acc, p) => acc + p.payoutAmount, 0);

    const totalApproved = payouts
      .filter((p) => p.status === 'APPROVED')
      .reduce((acc, p) => acc + p.payoutAmount, 0);

    const totalPaid = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((acc, p) => acc + p.payoutAmount, 0);

    return {
      stats: {
        activePartners: activeCount,
        declinedPartners: declinedCount,
        pendingPartners: pendingCount,
        totalPayoutsCalculated: Number(totalCalculated.toFixed(2)),
        totalPayoutsApproved: Number(totalApproved.toFixed(2)),
        totalPayoutsPaid: Number(totalPaid.toFixed(2)),
      },
      participations,
      payouts: payouts.slice(0, 50),
    };
  },

  /**
   * Atualização de status de lote ou repasse pelo Admin.
   */
  async updatePayoutStatus(payoutId: string, status: 'APPROVED' | 'PAID' | 'CANCELLED') {
    const data: any = { status };
    if (status === 'PAID') {
      data.paidAt = new Date();
    }

    const updated = await prisma.partnerPayout.update({
      where: { id: payoutId },
      data,
    });

    return updated;
  },
};
