import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const createAppointmentSchema = z.object({
  petId: z.string(),
  serviceId: z.string(),
  establishmentId: z.string(),
  professionalId: z.string().optional(),
  date: z.string().datetime(), // e.g. "2026-10-10T14:00:00Z"
});

const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const appointmentsController = {
  // Tutor listing their own appointments
  async listForTutor(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const appointments = await prisma.appointment.findMany({
      where: { tutorId: user.sub },
      include: {
        pet: true,
        service: true,
        establishment: true,
        professional: true,
      }
    });
    return reply.send(appointments);
  },

  // Establishment / Professional listing their appointments
  async listForProvider(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    
    if (user.role !== Role.ESTABLISHMENT && user.role !== Role.PROFESSIONAL) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { establishmentId: user.sub },
          { professionalId: user.sub }
        ]
      },
      include: {
        tutor: true,
        pet: true,
        service: true,
      }
    });

    return reply.send(appointments);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    
    if (user.role !== Role.TUTOR) {
      return reply.status(403).send({ error: 'Apenas tutores podem criar agendamentos.' });
    }
    
    const data = createAppointmentSchema.parse(request.body);
    
    // Check conflicts (simulated basic check)
    const existing = await prisma.appointment.findFirst({
      where: {
        establishmentId: data.establishmentId,
        professionalId: data.professionalId,
        date: data.date,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
      }
    });

    if (existing) {
      return reply.status(409).send({ error: 'Horário não disponível.' });
    }
    
    const appointment = await prisma.appointment.create({
      data: {
        ...data,
        tutorId: user.sub,
      }
    });

    return reply.status(201).send(appointment);
  },

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;
    const data = updateAppointmentStatusSchema.parse(request.body);

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Agendamento não encontrado' });

    // Validate permission
    const isOwner = existing.tutorId === user.sub;
    const isProvider = existing.establishmentId === user.sub || existing.professionalId === user.sub;
    
    if (!isOwner && !isProvider) {
      return reply.status(403).send({ error: 'Acesso negado' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: data.status },
    });

    return reply.send(appointment);
  }
};
