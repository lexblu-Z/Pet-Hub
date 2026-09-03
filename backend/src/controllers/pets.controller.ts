import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createPetSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  species: z.string().min(1, 'Espécie é obrigatória'),
  breed: z.string().optional(),
  gender: z.string().optional(),
  birthDate: z.string().nullable().optional(),
  approximateAge: z.string().nullable().optional(),
  vaccinationStatus: z.enum(['UP_TO_DATE', 'PENDING', 'UNKNOWN']).default('UNKNOWN').optional(),
  weight: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
});

const updatePetSchema = createPetSchema.partial();

export const petsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const pets = await prisma.pet.findMany({
        where: { tutorId: user.sub },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send(pets);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao listar pets' });
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = createPetSchema.parse(request.body);

      let parsedBirthDate: Date | null = null;
      if (data.birthDate) {
        parsedBirthDate = new Date(data.birthDate);
        if (isNaN(parsedBirthDate.getTime())) {
          return reply.status(400).send({ error: 'Data de nascimento inválida.' });
        }
        // Strict Validation: cannot be in the future
        const now = new Date();
        // Compare date part ignoring time
        const todayStr = now.toISOString().split('T')[0];
        const inputStr = parsedBirthDate.toISOString().split('T')[0];
        if (inputStr > todayStr) {
          return reply.status(400).send({ error: 'A data de nascimento não pode ser no futuro.' });
        }
      }

      const pet = await prisma.pet.create({
        data: {
          name: data.name,
          species: data.species,
          breed: data.breed || null,
          gender: data.gender || null,
          birthDate: parsedBirthDate,
          approximateAge: data.approximateAge || null,
          vaccinationStatus: data.vaccinationStatus || 'UNKNOWN',
          weight: data.weight || null,
          notes: data.notes || null,
          photo: data.photo || null,
          tutorId: user.sub,
        },
      });

      return reply.status(201).send(pet);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao cadastrar pet' });
    }
  },

  async get(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { id } = request.params;

      const pet = await prisma.pet.findFirst({
        where: { id, tutorId: user.sub },
      });

      if (!pet) return reply.status(404).send({ error: 'Pet não encontrado.' });
      return reply.send(pet);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar pet' });
    }
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { id } = request.params;
      const data = updatePetSchema.parse(request.body);

      const existingPet = await prisma.pet.findFirst({
        where: { id, tutorId: user.sub },
      });

      if (!existingPet) return reply.status(404).send({ error: 'Pet não encontrado.' });

      const updateData: any = { ...data };
      if (data.birthDate !== undefined) {
        if (data.birthDate) {
          const parsed = new Date(data.birthDate);
          if (isNaN(parsed.getTime())) {
            return reply.status(400).send({ error: 'Data de nascimento inválida.' });
          }
          const todayStr = new Date().toISOString().split('T')[0];
          const inputStr = parsed.toISOString().split('T')[0];
          if (inputStr > todayStr) {
            return reply.status(400).send({ error: 'A data de nascimento não pode ser no futuro.' });
          }
          updateData.birthDate = parsed;
        } else {
          updateData.birthDate = null;
        }
      }

      const pet = await prisma.pet.update({
        where: { id },
        data: updateData,
      });

      return reply.send(pet);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos' });
      }
      return reply.status(500).send({ error: 'Erro ao atualizar pet' });
    }
  },

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { id } = request.params;

      const existingPet = await prisma.pet.findFirst({
        where: { id, tutorId: user.sub },
      });

      if (!existingPet) return reply.status(404).send({ error: 'Pet não encontrado.' });

      await prisma.pet.delete({ where: { id } });

      return reply.send({ message: 'Pet removido com sucesso' });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao remover pet' });
    }
  }
};
