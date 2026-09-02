import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createPetSchema = z.object({
  name: z.string().min(2),
  species: z.string(),
  breed: z.string().optional(),
  photo: z.string().optional(),
});

const updatePetSchema = createPetSchema.partial();

export const petsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const pets = await prisma.pet.findMany({
      where: { tutorId: user.sub },
    });
    return reply.send(pets);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const data = createPetSchema.parse(request.body);

    const pet = await prisma.pet.create({
      data: {
        ...data,
        tutorId: user.sub,
      },
    });

    return reply.status(201).send(pet);
  },

  async get(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;

    const pet = await prisma.pet.findFirst({
      where: { id, tutorId: user.sub },
    });

    if (!pet) return reply.status(404).send({ error: 'Pet não encontrado.' });
    return reply.send(pet);
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;
    const data = updatePetSchema.parse(request.body);

    const existingPet = await prisma.pet.findFirst({
      where: { id, tutorId: user.sub },
    });

    if (!existingPet) return reply.status(404).send({ error: 'Pet não encontrado.' });

    const pet = await prisma.pet.update({
      where: { id },
      data,
    });

    return reply.send(pet);
  },

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;

    const existingPet = await prisma.pet.findFirst({
      where: { id, tutorId: user.sub },
    });

    if (!existingPet) return reply.status(404).send({ error: 'Pet não encontrado.' });

    await prisma.pet.delete({ where: { id } });

    return reply.send({ message: 'Pet removido com sucesso' });
  }
};
