import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  duration: z.number().min(1), // in minutes
  professionalId: z.string().optional(), // optional because an establishment can provide it
});

const updateServiceSchema = createServiceSchema.partial();

export const servicesController = {
  async list(request: FastifyRequest<{ Querystring: { establishmentId?: string, professionalId?: string } }>, reply: FastifyReply) {
    const { establishmentId, professionalId } = request.query;
    
    const services = await prisma.service.findMany({
      where: {
        ...(establishmentId && { establishmentId }),
        ...(professionalId && { professionalId }),
      },
      include: {
        establishment: true,
        professional: true,
      }
    });
    
    return reply.send(services);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    
    // Check if user is an establishment or a professional
    if (user.role !== Role.ESTABLISHMENT && user.role !== Role.PROFESSIONAL) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }
    
    // Check approval status
    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      include: { establishmentProfile: true, professionalProfile: true }
    });
    
    if (user.role === Role.ESTABLISHMENT && dbUser?.establishmentProfile?.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Estabelecimento aguardando aprovação.' });
    }
    if (user.role === Role.PROFESSIONAL && dbUser?.professionalProfile?.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Cadastro profissional em análise.' });
    }

    const data = createServiceSchema.parse(request.body);
    
    const service = await prisma.service.create({
      data: {
        ...data,
        establishmentId: user.role === Role.ESTABLISHMENT ? user.sub : undefined,
        professionalId: user.role === Role.PROFESSIONAL ? user.sub : data.professionalId,
      }
    });

    return reply.status(201).send(service);
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;
    const data = updateServiceSchema.parse(request.body);

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Serviço não encontrado' });

    if (existing.establishmentId !== user.sub && existing.professionalId !== user.sub) {
      return reply.status(403).send({ error: 'Acesso negado' });
    }

    const service = await prisma.service.update({
      where: { id },
      data,
    });

    return reply.send(service);
  },

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Serviço não encontrado' });

    if (existing.establishmentId !== user.sub && existing.professionalId !== user.sub) {
      return reply.status(403).send({ error: 'Acesso negado' });
    }

    await prisma.service.delete({ where: { id } });
    return reply.send({ message: 'Serviço removido' });
  }
};
