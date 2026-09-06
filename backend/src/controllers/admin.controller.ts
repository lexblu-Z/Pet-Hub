import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role, ApprovalStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

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
    const totalUsers = await prisma.user.count();
    const activeEstabs = await prisma.establishmentProfile.count({
      where: { status: ApprovalStatus.ACTIVE },
    });
    const pendingEstabs = await prisma.establishmentProfile.count({
      where: { status: ApprovalStatus.PENDING_APPROVAL },
    });
    const totalProfessionals = await prisma.professionalProfile.count();
    const totalAppointments = await prisma.appointment.count();

    const completedAppointments = await prisma.appointment.findMany({
      where: { status: 'COMPLETED' },
      include: { service: true },
    });
    const appRevenue = completedAppointments.reduce((sum, app) => sum + (app.service?.price || 0), 0);

    const paidOrders = await prisma.order.findMany({
      where: { status: { in: ['PAID', 'DELIVERED'] } },
    });
    const orderRevenue = paidOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);

    const revenue = appRevenue + orderRevenue;

    return reply.send({
      users: totalUsers,
      activeEstablishments: activeEstabs,
      pendingEstablishments: pendingEstabs,
      professionals: totalProfessionals,
      appointments: totalAppointments,
      revenue,
    });
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
};
