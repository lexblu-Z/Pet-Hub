import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient, ApprovalStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

export const establishmentsController = {
  // Public route for users to see approved establishments
  async listPublic(request: FastifyRequest, reply: FastifyReply) {
    const establishments = await prisma.user.findMany({
      where: {
        role: Role.ESTABLISHMENT,
        establishmentProfile: {
          status: ApprovalStatus.ACTIVE
        }
      },
      include: {
        establishmentProfile: true
      }
    });

    // Strip sensitive user info if needed, but since this is public, only send what's necessary
    const publicProfiles = establishments.map(e => ({
      id: e.id,
      name: e.name,
      description: e.establishmentProfile?.description,
      address: e.establishmentProfile?.address,
    }));

    return reply.send(publicProfiles);
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
  async updateStatus(request: FastifyRequest<{ Params: { id: string }, Body: { status: ApprovalStatus } }>, reply: FastifyReply) {
    const user = request.user as any;
    if (user.role !== Role.ADMIN) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { id } = request.params;
    const { status } = request.body;

    const profile = await prisma.establishmentProfile.findUnique({
      where: { userId: id }
    });

    if (!profile) return reply.status(404).send({ error: 'Estabelecimento não encontrado.' });

    await prisma.establishmentProfile.update({
      where: { userId: id },
      data: { status }
    });

    return reply.send({ message: `Status atualizado para ${status}` });
  },
};
