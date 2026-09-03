import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ApprovalStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const establishmentsController = {
  // Public route for users to see approved establishments & professionals
  async listPublic(request: FastifyRequest, reply: FastifyReply) {
    try {
      const establishments = await prisma.user.findMany({
        where: {
          role: { in: [Role.ESTABLISHMENT, Role.PROFESSIONAL] },
          OR: [
            {
              role: Role.ESTABLISHMENT,
              establishmentProfile: {
                status: ApprovalStatus.ACTIVE
              }
            },
            {
              role: Role.PROFESSIONAL,
              professionalProfile: {
                status: ApprovalStatus.ACTIVE
              }
            }
          ]
        },
        include: {
          establishmentProfile: true,
          professionalProfile: true,
        }
      });

      const publicProfiles = establishments.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone || e.establishmentProfile?.phone,
        role: e.role,
        avatar: e.avatar,
        businessName: e.establishmentProfile?.businessName || (e.role === Role.PROFESSIONAL ? `Dr(a). ${e.name}` : e.name),
        description: e.establishmentProfile?.description || e.professionalProfile?.bio,
        address: e.establishmentProfile?.address,
        city: e.establishmentProfile?.city,
        state: e.establishmentProfile?.state,
        type: e.establishmentProfile?.type || e.professionalProfile?.specialty || 'Veterinário',
        photos: e.establishmentProfile?.photos || [],
      }));

      return reply.send(publicProfiles);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar estabelecimentos' });
    }
  },

  // Admin route to list pending establishments
  async listPending(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    if (user.role !== Role.ADMIN) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const establishments = await prisma.user.findMany({
      where: {
        role: Role.ESTABLISHMENT,
        establishmentProfile: {
          status: ApprovalStatus.PENDING_APPROVAL
        }
      },
      include: {
        establishmentProfile: true
      }
    });

    return reply.send(establishments);
  },

  // Admin route to approve or reject
  async updateStatus(request: FastifyRequest<{ Params: { id: string }, Body: { status: ApprovalStatus, rejectionReason?: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    if (user.role !== Role.ADMIN) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { id } = request.params;
    const { status, rejectionReason } = request.body;

    const profile = await prisma.establishmentProfile.findUnique({
      where: { userId: id }
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil de estabelecimento não encontrado.' });
    }

    const updated = await prisma.establishmentProfile.update({
      where: { userId: id },
      data: {
        status,
        rejectionReason: status === ApprovalStatus.REJECTED ? rejectionReason : null
      }
    });

    return reply.send(updated);
  }
};
