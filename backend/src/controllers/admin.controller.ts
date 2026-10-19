import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role, ApprovalStatus, ReportStatus, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { logAdminAction } from '../utils/auditLogger';

const statusSchema = z.object({
  status: z.nativeEnum(ApprovalStatus),
  rejectionReason: z.string().optional().nullable(),
  suspendedUntil: z.union([z.string(), z.date()]).optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
});

const adminCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const adminController = {
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const [
      totalUsers,
      totalPets,
      activeEstabs,
      pendingEstabs,
      totalProfessionals,
      pendingProfessionals,
      totalAppointments,
      pendingReportsCount,
      usersToday,
      users7d,
      users30d,
      usersMonth,
      appointmentsToday,
      appointments7d,
      appointments30d,
      appointmentsMonth,
      completedAppointments,
      paidOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.pet.count(),
      prisma.establishmentProfile.count({ where: { status: ApprovalStatus.ACTIVE } }),
      prisma.establishmentProfile.count({ where: { status: ApprovalStatus.PENDING_APPROVAL } }),
      prisma.professionalProfile.count(),
      prisma.professionalProfile.count({ where: { status: ApprovalStatus.PENDING_APPROVAL } }),
      prisma.appointment.count(),
      prisma.moderationReport.count({ where: { status: { in: [ReportStatus.NOVA, ReportStatus.EM_ANALISE] } } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.appointment.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.appointment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.appointment.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.appointment.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.appointment.findMany({
        where: { status: 'COMPLETED' },
        include: { service: true },
      }),
      prisma.order.findMany({
        where: { status: { in: ['PAID', 'DELIVERED', 'COMPLETED'] } },
      }),
    ]);

    const appRevenue = completedAppointments.reduce((sum, app) => sum + (app.service?.price || 0), 0);
    const orderRevenue = paidOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
    const revenue = appRevenue + orderRevenue;

    const [topSpecies, recentAppointments] = await Promise.all([
      prisma.pet.groupBy({
        by: ['species'],
        _count: { _all: true },
        orderBy: { _count: { species: 'desc' } },
        take: 5,
      }),
      prisma.appointment.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          tutor: { select: { name: true, avatar: true } },
          pet: { select: { name: true, species: true } },
          service: { select: { name: true, price: true } },
          establishment: { select: { name: true } },
        },
      }),
    ]);

    return reply.send({
      users: totalUsers,
      pets: totalPets,
      activeEstablishments: activeEstabs,
      pendingEstablishments: pendingEstabs,
      professionals: totalProfessionals,
      pendingProfessionals,
      appointments: totalAppointments,
      revenue,
      pendingReports: pendingReportsCount,
      comparisons: {
        users: {
          today: usersToday,
          last7Days: users7d,
          last30Days: users30d,
          currentMonth: usersMonth,
        },
        appointments: {
          today: appointmentsToday,
          last7Days: appointments7d,
          last30Days: appointments30d,
          currentMonth: appointmentsMonth,
        },
      },
      rankings: {
        topSpecies: topSpecies.map((s) => ({ species: s.species, count: s._count._all })),
      },
      recentAppointments: recentAppointments.map((a) => ({
        id: a.id,
        code: `#AGD-${a.id.slice(0, 6).toUpperCase()}`,
        tutorName: a.tutor.name,
        petName: a.pet.name,
        serviceName: a.service?.name,
        status: a.status,
        date: a.date,
        price: a.service?.price,
      })),
    });
  },

  async getAlerts(request: FastifyRequest, reply: FastifyReply) {
    const [pendingEstabs, pendingProfs, openReports, problemOrders] = await Promise.all([
      prisma.establishmentProfile.count({ where: { status: ApprovalStatus.PENDING_APPROVAL } }),
      prisma.professionalProfile.count({ where: { status: ApprovalStatus.PENDING_APPROVAL } }),
      prisma.moderationReport.count({ where: { status: { in: [ReportStatus.NOVA, ReportStatus.EM_ANALISE] } } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
    ]);

    const alerts = [];

    if (pendingEstabs > 0) {
      alerts.push({
        id: 'pending_establishments',
        type: 'ESTABLISHMENT',
        priority: 'ALTA',
        title: 'Estabelecimentos aguardando aprovação',
        count: pendingEstabs,
        description: `${pendingEstabs} estabelecimento(s) solicitaram credenciamento e aguardam validação de documentos.`,
        actionLabel: 'Avaliar estabelecimentos',
        actionUrl: '/admin/estabelecimentos',
      });
    }

    if (pendingProfs > 0) {
      alerts.push({
        id: 'pending_professionals',
        type: 'PROFESSIONAL',
        priority: 'ALTA',
        title: 'Profissionais aguardando aprovação',
        count: pendingProfs,
        description: `${pendingProfs} profissional(is) autônomo(s) aguardam revisão de cadastro.`,
        actionLabel: 'Avaliar profissionais',
        actionUrl: '/admin/profissionais',
      });
    }

    if (openReports > 0) {
      alerts.push({
        id: 'open_reports',
        type: 'MODERATION',
        priority: 'URGENTE',
        title: 'Denúncias pendentes de moderação',
        count: openReports,
        description: `${openReports} denúncia(s) ativa(s) requerem intervenção ou parecer da moderação.`,
        actionLabel: 'Analisar denúncias',
        actionUrl: '/admin/moderacao',
      });
    }

    if (problemOrders > 0) {
      alerts.push({
        id: 'problem_orders',
        type: 'ORDER',
        priority: 'MEDIA',
        title: 'Pedidos cancelados / problemas',
        count: problemOrders,
        description: `${problemOrders} pedido(s) foram cancelados e podem demandar verificação de estorno.`,
        actionLabel: 'Ver no financeiro',
        actionUrl: '/admin/financeiro',
      });
    }

    return reply.send(alerts);
  },

  async getPerformanceChart(request: FastifyRequest, reply: FastifyReply) {
    const { period = '30d' } = request.query as any;
    const now = new Date();

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    interface Bucket {
      startMs: number;
      endMs: number;
      date: string;
      users: number;
      appointments: number;
      revenue: number;
    }

    const buckets: Bucket[] = [];
    let queryStartDate: Date;

    if (period === '1y') {
      const spDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      const [curYear, curMonth] = spDateStr.split('-').map(Number);
      const curMonthIdx = curMonth - 1; // 0-indexed month (0 = Jan, ..., 11 = Dec)

      const MONTH_NAMES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      // Generate exactly 12 monthly buckets: from 11 months ago to current month
      for (let i = 11; i >= 0; i--) {
        const rawMonth = curMonthIdx - i;
        const year = curYear + Math.floor(rawMonth / 12);
        const month = ((rawMonth % 12) + 12) % 12;

        const nextRawMonth = rawMonth + 1;
        const nextYear = curYear + Math.floor(nextRawMonth / 12);
        const nextMonth = ((nextRawMonth % 12) + 12) % 12;

        const startIso = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000-03:00`;
        const endIso = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01T00:00:00.000-03:00`;

        const startMs = new Date(startIso).getTime();
        const endMs = new Date(endIso).getTime();
        const label = `${MONTH_NAMES_PT[month]}/${String(year).slice(-2)}`;

        buckets.push({
          startMs,
          endMs,
          date: label,
          users: 0,
          appointments: 0,
          revenue: 0,
        });
      }

      queryStartDate = new Date(buckets[0].startMs);
    } else {
      let days = 30;
      if (period === '7d') days = 7;
      else if (period === '30d') days = 30;
      else if (period === '3m') days = 90;
      else if (period === '6m') days = 180;

      queryStartDate = new Date(now);
      queryStartDate.setDate(now.getDate() - days);
      queryStartDate.setHours(0, 0, 0, 0);

      const stepDays = days <= 30 ? 1 : days <= 90 ? 3 : 7;
      let currentStart = new Date(queryStartDate);

      while (currentStart < endOfToday) {
        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentStart.getDate() + stepDays);

        const label = currentStart.toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
        });

        buckets.push({
          startMs: currentStart.getTime(),
          endMs: currentEnd.getTime(),
          date: label,
          users: 0,
          appointments: 0,
          revenue: 0,
        });

        currentStart = currentEnd;
      }
    }

    const [users, appointments, orders] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: queryStartDate } },
        select: { createdAt: true },
      }),
      prisma.appointment.findMany({
        where: { date: { gte: queryStartDate } },
        select: { date: true, status: true, finalAmount: true, service: { select: { price: true } } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: queryStartDate }, status: { in: ['COMPLETED', 'DELIVERED'] } },
        select: { createdAt: true, totalAmount: true },
      }),
    ]);

    const findBucket = (d: Date): Bucket | undefined => {
      const t = d.getTime();
      if (t < queryStartDate.getTime()) return undefined;
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i];
        if (t >= b.startMs && (t < b.endMs || i === buckets.length - 1)) {
          return b;
        }
      }
      return undefined;
    };

    users.forEach((u) => {
      const bucket = findBucket(u.createdAt);
      if (bucket) bucket.users += 1;
    });

    appointments.forEach((a) => {
      const bucket = findBucket(a.date);
      if (bucket) {
        bucket.appointments += 1;
        if (a.status === AppointmentStatus.COMPLETED) {
          const rev = a.finalAmount ?? a.service?.price ?? 0;
          bucket.revenue += rev;
        }
      }
    });

    orders.forEach((o) => {
      const bucket = findBucket(o.createdAt);
      if (bucket) {
        bucket.revenue += o.totalAmount || 0;
      }
    });

    const data = buckets.map((b) => ({
      date: b.date,
      users: b.users,
      appointments: b.appointments,
      revenue: Number(b.revenue.toFixed(2)),
    }));

    return reply.send(data);
  },

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        establishmentProfile: true,
        professionalProfile: true,
        _count: {
          select: {
            pets: true,
            appointmentsAsTutor: true,
            appointmentsAsEstablishment: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(users);
  },

  async listEstablishments(request: FastifyRequest, reply: FastifyReply) {
    const establishments = await prisma.user.findMany({
      where: { role: Role.ESTABLISHMENT },
      include: {
        establishmentProfile: true,
        servicesAsEstablishment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(establishments);
  },

  async updateEstablishmentStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const { status, rejectionReason, suspendedUntil, suspensionReason } = statusSchema.parse(request.body);

      if (status === ApprovalStatus.REJECTED && (!rejectionReason || !rejectionReason.trim())) {
        return reply.status(400).send({ error: 'A justificativa é obrigatória para rejeitar o estabelecimento.' });
      }

      if (status === ApprovalStatus.SUSPENDED) {
        if (!suspensionReason || !suspensionReason.trim()) {
          return reply.status(400).send({ error: 'O motivo da suspensão é obrigatório.' });
        }
        if (!suspendedUntil) {
          return reply.status(400).send({ error: 'A data/período de término da suspensão é obrigatória.' });
        }
      }

      // Find by userId or profile id
      let profile = await prisma.establishmentProfile.findFirst({
        where: {
          OR: [{ userId: id }, { id: id }],
        },
      });

      if (!profile) {
        // Fallback: check if User exists
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user || user.role !== Role.ESTABLISHMENT) {
          return reply.status(404).send({ error: 'Estabelecimento não encontrado.' });
        }
        profile = await prisma.establishmentProfile.create({
          data: {
            userId: user.id,
            status,
            rejectionReason: status === ApprovalStatus.REJECTED ? rejectionReason?.trim() : null,
            suspendedUntil: status === ApprovalStatus.SUSPENDED ? new Date(suspendedUntil!) : null,
            suspensionReason: status === ApprovalStatus.SUSPENDED ? suspensionReason?.trim() : null,
            suspendedAt: status === ApprovalStatus.SUSPENDED ? new Date() : null,
          },
        });
        return reply.send(profile);
      }

      const updated = await prisma.establishmentProfile.update({
        where: { id: profile.id },
        data: {
          status,
          rejectionReason: status === ApprovalStatus.REJECTED ? (rejectionReason?.trim() || null) : null,
          suspendedUntil: status === ApprovalStatus.SUSPENDED ? new Date(suspendedUntil!) : null,
          suspensionReason: status === ApprovalStatus.SUSPENDED ? (suspensionReason?.trim() || null) : null,
          suspendedAt: status === ApprovalStatus.SUSPENDED ? new Date() : null,
        },
      });

      return reply.send(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos.' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar status do estabelecimento.' });
    }
  },

  async listProfessionals(request: FastifyRequest, reply: FastifyReply) {
    const professionals = await prisma.user.findMany({
      where: { role: Role.PROFESSIONAL },
      include: {
        professionalProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const withProfiles = await Promise.all(professionals.map(async (p) => {
      if (!p.professionalProfile) {
        const createdProfile = await prisma.professionalProfile.create({
          data: {
            userId: p.id,
            status: ApprovalStatus.PENDING_APPROVAL,
          }
        });
        return { ...p, professionalProfile: createdProfile };
      }
      return p;
    }));

    return reply.send(withProfiles);
  },

  async updateProfessionalStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const { status, rejectionReason, suspendedUntil, suspensionReason } = statusSchema.parse(request.body);

      if (status === ApprovalStatus.REJECTED && (!rejectionReason || !rejectionReason.trim())) {
        return reply.status(400).send({ error: 'A justificativa é obrigatória para rejeitar o profissional.' });
      }

      if (status === ApprovalStatus.SUSPENDED) {
        if (!suspensionReason || !suspensionReason.trim()) {
          return reply.status(400).send({ error: 'O motivo da suspensão é obrigatório.' });
        }
        if (!suspendedUntil) {
          return reply.status(400).send({ error: 'A data/período de término da suspensão é obrigatória.' });
        }
      }

      let profile = await prisma.professionalProfile.findFirst({
        where: {
          OR: [{ userId: id }, { id: id }],
        },
      });

      if (!profile) {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user || user.role !== Role.PROFESSIONAL) {
          return reply.status(404).send({ error: 'Profissional não encontrado.' });
        }
        profile = await prisma.professionalProfile.create({
          data: {
            userId: user.id,
            status,
            rejectionReason: status === ApprovalStatus.REJECTED ? rejectionReason?.trim() : null,
            suspendedUntil: status === ApprovalStatus.SUSPENDED ? new Date(suspendedUntil!) : null,
            suspensionReason: status === ApprovalStatus.SUSPENDED ? suspensionReason?.trim() : null,
            suspendedAt: status === ApprovalStatus.SUSPENDED ? new Date() : null,
          },
        });
        return reply.send(profile);
      }

      const updated = await prisma.professionalProfile.update({
        where: { id: profile.id },
        data: {
          status,
          rejectionReason: status === ApprovalStatus.REJECTED ? (rejectionReason?.trim() || null) : null,
          suspendedUntil: status === ApprovalStatus.SUSPENDED ? new Date(suspendedUntil!) : null,
          suspensionReason: status === ApprovalStatus.SUSPENDED ? (suspensionReason?.trim() || null) : null,
          suspendedAt: status === ApprovalStatus.SUSPENDED ? new Date() : null,
        },
      });

      return reply.send(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos.' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar status do profissional.' });
    }
  },

  async createAdmin(request: FastifyRequest, reply: FastifyReply) {
    const data = adminCreateSchema.parse(request.body);
    
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return reply.status(400).send({ error: 'E-mail já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const admin = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: Role.ADMIN,
      }
    });
    
    return reply.status(201).send({ id: admin.id, name: admin.name, email: admin.email, role: admin.role });
  },

  async deleteUser(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const requestingUser = request.user as any;

      // 1. Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: {
          establishmentProfile: true,
          professionalProfile: true,
        },
      });

      if (!targetUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      // 2. Prevent admin from deleting themselves
      if (targetUser.id === requestingUser.sub) {
        return reply.status(400).send({
          error: 'Você não pode excluir sua própria conta de administrador.',
        });
      }

      // 3. Prevent deleting the last remaining admin in the system
      if (targetUser.role === Role.ADMIN) {
        const adminCount = await prisma.user.count({
          where: { role: Role.ADMIN },
        });
        if (adminCount <= 1) {
          return reply.status(400).send({
            error: 'Não é permitido excluir o único administrador da plataforma.',
          });
        }
      }

      const targetEmail = targetUser.email.toLowerCase().trim();

      // 4. Atomic transaction to cleanly wipe all related records and User
      await prisma.$transaction(async (tx) => {
        // Clean up appointments where user is tutor, establishment, or professional
        await tx.appointment.deleteMany({
          where: {
            OR: [
              { tutorId: id },
              { establishmentId: id },
              { professionalId: id },
            ],
          },
        });

        // Clean up services created by establishment or professional
        await tx.service.deleteMany({
          where: {
            OR: [
              { establishmentId: id },
              { professionalId: id },
            ],
          },
        });

        // Clean up products and order items
        await tx.orderItem.deleteMany({
          where: { establishmentId: id },
        });

        await tx.product.deleteMany({
          where: { establishmentId: id },
        });

        // Clean up orders made by tutor
        await tx.order.deleteMany({
          where: { tutorId: id },
        });

        // Clean up cart items
        await tx.cartItem.deleteMany({
          where: { tutorId: id },
        });

        // Clean up pets
        await tx.pet.deleteMany({
          where: { tutorId: id },
        });

        // Clean up employees
        await tx.employee.deleteMany({
          where: { establishmentId: id },
        });

        // Clean up Google Calendar Connection
        await tx.googleCalendarConnection.deleteMany({
          where: { userId: id },
        });

        // Clean up notifications
        await tx.notification.deleteMany({
          where: { userId: id },
        });

        // Clean up payment methods and cashback
        await tx.paymentMethod.deleteMany({
          where: { userId: id },
        });

        await tx.cashbackTransaction.deleteMany({
          where: { userId: id },
        });

        // Clean up profiles
        await tx.establishmentProfile.deleteMany({
          where: { userId: id },
        });

        await tx.professionalProfile.deleteMany({
          where: { userId: id },
        });

        await tx.adminProfile.deleteMany({
          where: { userId: id },
        });

        // Clean up any AuthVerificationCode associated with this email
        await tx.authVerificationCode.deleteMany({
          where: { email: targetEmail },
        });

        // Finally, delete the User record itself
        await tx.user.delete({
          where: { id },
        });
      });

      request.log.info(`[Admin] User deleted successfully: ${id} (${targetEmail})`);

      return reply.send({
        success: true,
        message: 'Conta e dados associados excluídos com sucesso.',
        email: targetEmail,
      });
    } catch (err: any) {
      request.log.error(err, 'Error deleting user:');
      return reply.status(500).send({
        error: 'Erro interno ao excluir usuário. Tente novamente.',
      });
    }
  },

  // Address Change Requests (Approval / Rejection)
  async listAddressRequests(request: FastifyRequest<{
    Querystring: { status?: string };
  }>, reply: FastifyReply) {
    const { status } = request.query;
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.establishmentAddressRequest.findMany({
      where,
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
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(requests);
  },

  async approveAddressRequest(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const adminUser = request.user as any;

    const addressReq = await prisma.establishmentAddressRequest.findUnique({
      where: { id },
      include: {
        establishment: {
          include: { establishmentProfile: true },
        },
      },
    });

    if (!addressReq) {
      return reply.status(404).send({ error: 'Solicitação de endereço não encontrada.' });
    }

    if (addressReq.status !== 'PENDING') {
      return reply.status(400).send({ error: `Esta solicitação já foi ${addressReq.status === 'APPROVED' ? 'aprovada' : 'rejeitada'}.` });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.establishmentProfile.update({
        where: { userId: addressReq.establishmentId },
        data: {
          address: addressReq.requestedAddress,
          city: addressReq.requestedCity,
          state: addressReq.requestedState,
          zipCode: addressReq.requestedZipCode || addressReq.currentZipCode,
        },
      });

      const updatedReq = await tx.establishmentAddressRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedByAdminId: adminUser?.sub || adminUser?.id || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: addressReq.establishmentId,
          title: 'Endereço Atualizado e Aprovado',
          message: `Sua solicitação de alteração de endereço foi aprovada com sucesso! Seu novo endereço oficial é: ${addressReq.requestedAddress}, ${addressReq.requestedCity} - ${addressReq.requestedState}.`,
          type: 'SYSTEM',
        },
      });

      return { profile: updatedProfile, request: updatedReq };
    });

    return reply.send({
      message: 'Solicitação de alteração de endereço aprovada com sucesso!',
      ...result,
    });
  },

  async rejectAddressRequest(request: FastifyRequest<{
    Params: { id: string };
    Body: { rejectionReason?: string };
  }>, reply: FastifyReply) {
    const { id } = request.params;
    const adminUser = request.user as any;
    const { rejectionReason } = (request.body || {}) as { rejectionReason?: string };

    const addressReq = await prisma.establishmentAddressRequest.findUnique({
      where: { id },
    });

    if (!addressReq) {
      return reply.status(404).send({ error: 'Solicitação de endereço não encontrada.' });
    }

    if (addressReq.status !== 'PENDING') {
      return reply.status(400).send({ error: `Esta solicitação já foi ${addressReq.status === 'APPROVED' ? 'aprovada' : 'rejeitada'}.` });
    }

    const updatedReq = await prisma.$transaction(async (tx) => {
      const rejected = await tx.establishmentAddressRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason?.trim() || 'Solicitação reprovada pela moderação.',
          reviewedAt: new Date(),
          reviewedByAdminId: adminUser?.sub || adminUser?.id || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: addressReq.establishmentId,
          title: 'Solicitação de Alteração de Endereço Recusada',
          message: `Sua solicitação para alterar o endereço foi recusada. Motivo: ${rejectionReason?.trim() || 'Dados inconsistentes ou fora dos padrões do PetHub.'}`,
          type: 'SYSTEM',
        },
      });

      return rejected;
    });

    return reply.send({
      message: 'Solicitação de alteração de endereço rejeitada.',
      request: updatedReq,
    });
  },
};
