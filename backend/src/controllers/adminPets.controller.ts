import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const listPetsQuerySchema = z.object({
  search: z.string().optional(),
  species: z.string().optional(),
  breed: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const adminPetsController = {
  async listPets(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = listPetsQuerySchema.parse(request.query);
      const skip = (query.page - 1) * query.limit;

      const where: any = {};
      if (query.species) {
        where.species = { equals: query.species, mode: 'insensitive' };
      }
      if (query.breed) {
        where.breed = { contains: query.breed, mode: 'insensitive' };
      }
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { breed: { contains: query.search, mode: 'insensitive' } },
          { species: { contains: query.search, mode: 'insensitive' } },
          {
            user: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        ];
      }

      // Query pets with tutor relationship
      // Note: Pet has relation `tutor User @relation("TutorAppointments", fields: [tutorId]...)` wait, let's verify Pet model relation name to User
      const [pets, total] = await Promise.all([
        prisma.pet.findMany({
          where,
          include: {
            appointments: {
              select: { id: true, date: true, status: true },
              take: 5,
              orderBy: { date: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        prisma.pet.count({ where }),
      ]);

      // Manually or via relation fetch tutors
      const tutorIds = Array.from(new Set(pets.map((p) => p.tutorId)));
      const tutors = await prisma.user.findMany({
        where: { id: { in: tutorIds } },
        select: { id: true, name: true, email: true, phone: true, avatar: true },
      });
      const tutorMap = new Map(tutors.map((t) => [t.id, t]));

      const petsWithTutor = pets.map((pet) => ({
        ...pet,
        tutor: tutorMap.get(pet.tutorId) || null,
      }));

      // Species distribution aggregations
      const speciesDistribution = await prisma.pet.groupBy({
        by: ['species'],
        _count: { _all: true },
      });

      // Total pets in system
      const totalRegistered = await prisma.pet.count();

      // Pets created in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newInPeriod = await prisma.pet.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });

      return reply.send({
        pets: petsWithTutor,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        stats: {
          total: totalRegistered,
          newInLast30Days: newInPeriod,
          speciesDistribution: speciesDistribution.map((s) => ({
            species: s.species,
            count: s._count._all,
          })),
        },
      });
    } catch (error: any) {
      request.log.error(error, 'Error listing pets for admin');
      return reply.status(500).send({ error: 'Erro ao listar pets.' });
    }
  },

  async getPetDetails(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const pet = await prisma.pet.findUnique({
        where: { id },
        include: {
          appointments: {
            include: {
              service: true,
              establishment: { select: { id: true, name: true } },
              professional: { select: { id: true, name: true } },
            },
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!pet) {
        return reply.status(404).send({ error: 'Pet não encontrado.' });
      }

      const tutor = await prisma.user.findUnique({
        where: { id: pet.tutorId },
        select: { id: true, name: true, email: true, phone: true, avatar: true },
      });

      return reply.send({
        ...pet,
        tutor,
      });
    } catch (error: any) {
      request.log.error(error, 'Error getting pet details');
      return reply.status(500).send({ error: 'Erro ao carregar detalhes do pet.' });
    }
  },
};
