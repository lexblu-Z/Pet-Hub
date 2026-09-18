import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { normalizeSpecies, COMMON_BREEDS } from '../utils/species';

const vaccineItemSchema = z.object({
  name: z.string().min(1, 'Nome da vacina é obrigatório'),
  date: z.string().nullable().optional(),
});

const createPetSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  species: z.string().min(1, 'Espécie é obrigatória'),
  breed: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  approximateAge: z.string().nullable().optional(),
  vaccinationStatus: z.string().nullable().optional(),
  weight: z.number().positive('O peso deve ser maior que zero').max(500, 'Peso deve ser plausível').nullable().optional(),
  notes: z.string().nullable().optional(),
  isNeutered: z.boolean().nullable().optional(),
  behaviorNotes: z.string().nullable().optional(),
  specialCareNotes: z.string().nullable().optional(),
  vaccines: z.array(vaccineItemSchema).optional().default([]),
  photo: z.string().nullable().optional(),
  coverPhoto: z.string().nullable().optional(),
});

const updatePetSchema = createPetSchema.partial();

function normalizeGender(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().toUpperCase();
  if (clean === 'MALE' || clean === 'MACHO' || clean === 'M') return 'MALE';
  if (clean === 'FEMALE' || clean === 'FÊMEA' || clean === 'FEMEA' || clean === 'F') return 'FEMALE';
  return null;
}

function normalizeVaccinationStatus(raw?: string | null): string {
  if (!raw) return 'UNKNOWN';
  const clean = raw.trim().toUpperCase();
  if (clean.includes('UP_TO_DATE') || clean.includes('EM DIA')) return 'UP_TO_DATE';
  if (clean.includes('PENDING') || clean.includes('ATRASAD') || clean.includes('PENDENTE')) return 'PENDING';
  if (clean.includes('UNCERTAIN') || clean.includes('CERTEZA')) return 'UNCERTAIN';
  return 'UNKNOWN';
}

function validateBreedCompatibility(speciesRaw: string, breedRaw?: string | null): string | null {
  if (!breedRaw || !breedRaw.trim()) return null;
  const breedClean = breedRaw.trim().toLowerCase();
  
  // Generic breeds allowed for any animal
  if (['srd', 'srd (sem raça definida)', 'sem raça definida', 'outra', 'outro', 'mestiço', 'mestiça'].includes(breedClean)) {
    return null;
  }

  const speciesKey = normalizeSpecies(speciesRaw);
  const dogBreeds = (COMMON_BREEDS.dog || []).map(b => b.toLowerCase());
  const catBreeds = (COMMON_BREEDS.cat || []).map(b => b.toLowerCase());

  if (speciesKey === 'cat' && dogBreeds.includes(breedClean) && !catBreeds.includes(breedClean)) {
    return `A raça "${breedRaw}" não é compatível com a espécie Gato.`;
  }
  if (speciesKey === 'dog' && catBreeds.includes(breedClean) && !dogBreeds.includes(breedClean)) {
    return `A raça "${breedRaw}" não é compatível com a espécie Cachorro.`;
  }

  return null;
}

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

      // Validate breed compatibility
      const breedError = validateBreedCompatibility(data.species, data.breed);
      if (breedError) {
        return reply.status(400).send({ error: breedError });
      }

      let parsedBirthDate: Date | null = null;
      if (data.birthDate) {
        parsedBirthDate = new Date(data.birthDate);
        if (isNaN(parsedBirthDate.getTime())) {
          return reply.status(400).send({ error: 'Data de nascimento inválida.' });
        }
        // Strict Validation: cannot be in the future
        const now = new Date();
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
          breed: data.breed?.trim() || null,
          gender: normalizeGender(data.gender),
          birthDate: parsedBirthDate,
          approximateAge: data.approximateAge?.trim() || null,
          vaccinationStatus: normalizeVaccinationStatus(data.vaccinationStatus),
          weight: data.weight !== undefined && data.weight !== null ? Number(data.weight) : null,
          notes: data.notes?.trim() || null,
          isNeutered: data.isNeutered !== undefined ? data.isNeutered : null,
          behaviorNotes: data.behaviorNotes?.trim() || null,
          specialCareNotes: data.specialCareNotes?.trim() || null,
          vaccines: Array.isArray(data.vaccines) ? (data.vaccines as any) : [],
          photo: data.photo || null,
          coverPhoto: data.coverPhoto || null,
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

      const pet = await prisma.pet.findUnique({
        where: { id },
      });

      if (!pet) return reply.status(404).send({ error: 'Pet não encontrado.' });

      // Privacy check: Only the tutor, ADMIN, or an establishment/professional with an appointment can view
      const isTutor = pet.tutorId === user.sub;
      const isAdmin = user.role === 'ADMIN';

      if (!isTutor && !isAdmin) {
        const hasAppointment = await prisma.appointment.findFirst({
          where: {
            petId: id,
            OR: [
              { establishmentId: user.sub },
              { professionalId: user.sub },
            ],
          },
        });

        if (!hasAppointment) {
          return reply.status(403).send({ error: 'Acesso restrito: Você não possui autorização para visualizar este pet.' });
        }
      }

      return reply.send(pet);
    } catch (error) {
      request.log.error(error);
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

      if (!existingPet) return reply.status(404).send({ error: 'Pet não encontrado ou permissão negada.' });

      const targetSpecies = data.species !== undefined ? data.species : existingPet.species;
      const targetBreed = data.breed !== undefined ? data.breed : existingPet.breed;

      // Validate breed compatibility
      if (targetBreed) {
        const breedError = validateBreedCompatibility(targetSpecies, targetBreed);
        if (breedError) {
          return reply.status(400).send({ error: breedError });
        }
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.species !== undefined) updateData.species = data.species;
      if (data.breed !== undefined) updateData.breed = data.breed?.trim() || null;
      if (data.gender !== undefined) updateData.gender = normalizeGender(data.gender);
      if (data.approximateAge !== undefined) updateData.approximateAge = data.approximateAge?.trim() || null;
      if (data.vaccinationStatus !== undefined) updateData.vaccinationStatus = normalizeVaccinationStatus(data.vaccinationStatus);
      if (data.weight !== undefined) updateData.weight = data.weight !== null ? Number(data.weight) : null;
      if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
      if (data.isNeutered !== undefined) updateData.isNeutered = data.isNeutered;
      if (data.behaviorNotes !== undefined) updateData.behaviorNotes = data.behaviorNotes?.trim() || null;
      if (data.specialCareNotes !== undefined) updateData.specialCareNotes = data.specialCareNotes?.trim() || null;
      if (data.vaccines !== undefined) updateData.vaccines = data.vaccines;
      if (data.photo !== undefined) updateData.photo = data.photo || null;
      if (data.coverPhoto !== undefined) updateData.coverPhoto = data.coverPhoto || null;

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

      const updated = await prisma.pet.update({
        where: { id },
        data: updateData,
      });

      return reply.send(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos' });
      }
      request.log.error(error);
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

      if (!existingPet) return reply.status(404).send({ error: 'Pet não encontrado ou permissão negada.' });

      await prisma.pet.delete({ where: { id } });

      return reply.send({ message: 'Pet removido com sucesso' });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao remover pet' });
    }
  }
};
