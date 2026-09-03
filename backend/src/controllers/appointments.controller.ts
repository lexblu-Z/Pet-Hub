import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';

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
    try {
      const user = request.user as any;
      
      if (user.role !== Role.TUTOR) {
        return reply.status(403).send({ error: 'Apenas tutores podem criar agendamentos.' });
      }
      
      const data = createAppointmentSchema.parse(request.body);
      
      // Check if establishment is ACTIVE
      const estUser = await prisma.user.findUnique({
        where: { id: data.establishmentId },
        include: { establishmentProfile: true }
      });
      if (!estUser || estUser.establishmentProfile?.status !== 'ACTIVE') {
        return reply.status(403).send({ error: 'Estabelecimento indisponível para agendamentos.' });
      }

      // Check if professional is ACTIVE (if provided)
      if (data.professionalId) {
        const profUser = await prisma.user.findUnique({
          where: { id: data.professionalId },
          include: { professionalProfile: true }
        });
        if (!profUser || profUser.professionalProfile?.status !== 'ACTIVE') {
          return reply.status(403).send({ error: 'Profissional indisponível para agendamentos.' });
        }
      }

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
        },
        include: {
          pet: true,
          service: true,
        }
      });

      // Generate real notification for the establishment
      try {
        const petName = appointment.pet?.name || 'Pet';
        const serviceName = appointment.service?.name || 'Serviço';
        const formattedDate = new Date(appointment.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        await prisma.notification.create({
          data: {
            userId: data.establishmentId,
            title: 'Novo agendamento recebido',
            message: `${petName} possui um serviço de ${serviceName} agendado para ${formattedDate}.`,
            type: 'APPOINTMENT',
          }
        });
      } catch (notifErr) {
        request.log.error(notifErr);
      }

      // Synchronize with Google Calendar (idempotent, asynchronous, non-blocking)
      googleCalendarService.syncAppointment(appointment.id, 'CREATE').catch((syncErr) => {
        request.log.error('Google Calendar initial sync error:', syncErr.message);
      });

      return reply.status(201).send(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro interno no servidor' });
    }
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

    // Synchronize status change with Google Calendar (idempotent, asynchronous)
    const syncAction = data.status === AppointmentStatus.CANCELLED ? 'CANCEL' : 'UPDATE';
    googleCalendarService.syncAppointment(appointment.id, syncAction).catch((syncErr) => {
      request.log.error('Google Calendar status sync error:', syncErr.message);
    });

    return reply.send(appointment);
  }
};
