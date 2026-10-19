import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppointmentStatus } from '@prisma/client';

const listQuerySchema = z.object({
  date: z.string().optional(), // YYYY-MM-DD
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  establishmentId: z.string().optional(),
  professionalId: z.string().optional(),
  search: z.string().optional(),
});

const searchQuerySchema = z.object({
  code: z.string().min(1, 'Código ou ID é obrigatório.'),
});

export const adminAppointmentsController = {
  async listUniversal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = listQuerySchema.parse(request.query);
      const where: any = {};

      if (query.date) {
        // Specific date range (start of day to end of day)
        const dayStart = new Date(query.date);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(query.date);
        dayEnd.setUTCHours(23, 59, 59, 999);
        where.date = { gte: dayStart, lte: dayEnd };
      } else if (query.startDate || query.endDate) {
        where.date = {};
        if (query.startDate) where.date.gte = new Date(query.startDate);
        if (query.endDate) where.date.lte = new Date(query.endDate);
      }

      if (query.status) {
        where.status = query.status;
      }
      if (query.establishmentId) {
        where.establishmentId = query.establishmentId;
      }
      if (query.professionalId) {
        where.professionalId = query.professionalId;
      }
      if (query.search) {
        where.OR = [
          { tutor: { name: { contains: query.search, mode: 'insensitive' } } },
          { pet: { name: { contains: query.search, mode: 'insensitive' } } },
          { service: { name: { contains: query.search, mode: 'insensitive' } } },
          { establishment: { name: { contains: query.search, mode: 'insensitive' } } },
          { professional: { name: { contains: query.search, mode: 'insensitive' } } },
        ];
      }

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          tutor: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, defaultAvatar: true },
          },
          pet: {
            select: { id: true, name: true, species: true, breed: true, gender: true, weight: true },
          },
          service: {
            select: { id: true, name: true, duration: true, price: true, category: true, animalType: true },
          },
          establishment: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, defaultAvatar: true, establishmentProfile: true },
          },
          professional: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, defaultAvatar: true, professionalProfile: true },
          },
          employee: {
            select: { id: true, name: true, role: true, phone: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      // Format appointments with standardized time and dateStr
      const formatted = appointments.map((app) => {
        const dateObj = new Date(app.date);
        const timeStr = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
        const dateStr = app.date.toISOString().split('T')[0];
        return {
          ...app,
          dateStr,
          time: timeStr,
          dateISO: app.date.toISOString(),
          code: `#AGD-${app.id.slice(0, 6).toUpperCase()}`,
        };
      });

      // Count by status
      const statusCounts = {
        ALL: appointments.length,
        PENDING: appointments.filter((a) => a.status === AppointmentStatus.PENDING).length,
        CONFIRMED: appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED).length,
        COMPLETED: appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
        CANCELLED: appointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
      };

      return reply.send({
        appointments: formatted,
        total: appointments.length,
        counts: statusCounts,
        selectedDate: query.date || null,
      });
    } catch (error: any) {
      request.log.error(error, 'Error listing universal appointments');
      return reply.status(500).send({ error: 'Erro ao carregar agenda universal.' });
    }
  },

  async searchByCode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = searchQuerySchema.parse(request.query);
      let cleanCode = query.code.trim();

      // If user typed #AGD-123456 or AGD-123456, extract the short prefix
      if (cleanCode.startsWith('#')) {
        cleanCode = cleanCode.substring(1);
      }
      if (cleanCode.toUpperCase().startsWith('AGD-')) {
        cleanCode = cleanCode.substring(4);
      }

      // Try exact UUID or substring matching
      const appointment = await prisma.appointment.findFirst({
        where: {
          OR: [
            { id: { equals: cleanCode, mode: 'insensitive' } },
            { id: { startsWith: cleanCode.toLowerCase() } },
          ],
        },
        include: {
          tutor: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, defaultAvatar: true },
          },
          pet: true,
          service: true,
          establishment: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, defaultAvatar: true, establishmentProfile: true },
          },
          professional: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, defaultAvatar: true, professionalProfile: true },
          },
          employee: true,
        },
      });

      if (!appointment) {
        return reply.status(404).send({ error: `Nenhum agendamento encontrado com o código "${query.code}".` });
      }

      const dateObj = new Date(appointment.date);
      const timeStr = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
      const dateStr = appointment.date.toISOString().split('T')[0];

      return reply.send({
        ...appointment,
        dateStr,
        time: timeStr,
        dateISO: appointment.date.toISOString(),
        code: `#AGD-${appointment.id.slice(0, 6).toUpperCase()}`,
      });
    } catch (error: any) {
      request.log.error(error, 'Error searching appointment by code');
      return reply.status(400).send({ error: error.message || 'Erro ao pesquisar agendamento.' });
    }
  },
};
