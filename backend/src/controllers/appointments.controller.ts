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

  async getAvailableSlots(request: FastifyRequest<{ Querystring: { date?: string; professionalId?: string; establishmentId?: string; serviceId?: string } }>, reply: FastifyReply) {
    const { date, professionalId, establishmentId, serviceId } = request.query;

    if (!date) {
      return reply.status(400).send({ error: 'Data é obrigatória (formato YYYY-MM-DD).' });
    }

    const dateParts = date.split('-');
    if (dateParts.length !== 3) {
      return reply.status(400).send({ error: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const targetDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
    const dayOfWeek = targetDate.getUTCDay();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const ptDayKeys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const dayKey = dayKeys[dayOfWeek];
    const ptDayKey = ptDayKeys[dayOfWeek];

    let openTime = '09:00';
    let closeTime = '18:00';
    let hasBreak = false;
    let breakStart = '12:00';
    let breakEnd = '13:30';
    let isOpen = true;
    let stepMinutes = 60;
    let minAdvanceHours = 2;

    if (serviceId) {
      const svc = await prisma.service.findUnique({ where: { id: serviceId } });
      if (svc && svc.duration) {
        stepMinutes = svc.duration;
      }
    }

    if (professionalId) {
      const prof = await prisma.user.findUnique({
        where: { id: professionalId },
        include: { professionalProfile: true },
      });

      if (!prof || prof.professionalProfile?.status !== 'ACTIVE') {
        return reply.send({ date, slots: [], availableSlots: [], isClosed: true });
      }

      const bookingSettings = prof.professionalProfile.bookingSettings as any;
      if (bookingSettings) {
        if (bookingSettings.acceptOnlineBooking === false || bookingSettings.allowOnlineBooking === false) {
          return reply.send({ date, slots: [], availableSlots: [], isClosed: true, message: 'Agendamentos online desabilitados.' });
        }
        if (bookingSettings.minAdvanceHours) {
          minAdvanceHours = bookingSettings.minAdvanceHours;
        } else if (bookingSettings.minAdvanceNoticeHours) {
          minAdvanceHours = bookingSettings.minAdvanceNoticeHours;
        }
        if (Array.isArray(bookingSettings.unavailableDays) && bookingSettings.unavailableDays.includes(date)) {
          return reply.send({ date, slots: [], availableSlots: [], isClosed: true });
        }
        if (bookingSettings.vacationStart && bookingSettings.vacationEnd) {
          if (date >= bookingSettings.vacationStart && date <= bookingSettings.vacationEnd) {
            return reply.send({ date, slots: [], availableSlots: [], isClosed: true });
          }
        }
      }

      const workingHours = prof.professionalProfile.workingHours as any;
      if (workingHours) {
        const dayConfig = workingHours[dayKey] || workingHours[ptDayKey];
        if (dayConfig) {
          isOpen = dayConfig.enabled !== undefined ? Boolean(dayConfig.enabled) : Boolean(dayConfig.isOpen);
          if (dayConfig.open) openTime = dayConfig.open;
          if (dayConfig.close) closeTime = dayConfig.close;
          if (dayConfig.hasBreak) {
            hasBreak = true;
            breakStart = dayConfig.breakStart || '12:00';
            breakEnd = dayConfig.breakEnd || '13:30';
          }
        }
      }
    } else if (establishmentId) {
      const est = await prisma.user.findUnique({
        where: { id: establishmentId },
        include: { establishmentProfile: true },
      });
      if (!est || est.establishmentProfile?.status !== 'ACTIVE') {
        return reply.send({ date, slots: [], availableSlots: [], isClosed: true });
      }
      const workingHours = est.establishmentProfile.workingHours as any;
      if (workingHours) {
        const dayConfig = workingHours[dayKey] || workingHours[ptDayKey];
        if (dayConfig) {
          isOpen = dayConfig.enabled !== undefined ? Boolean(dayConfig.enabled) : Boolean(dayConfig.isOpen);
          if (dayConfig.open) openTime = dayConfig.open;
          if (dayConfig.close) closeTime = dayConfig.close;
        }
      }
    }

    if (!isOpen) {
      return reply.send({ date, slots: [], availableSlots: [], isClosed: true, message: 'Fechado neste dia.' });
    }

    // Generate candidate slot times
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const openTotalMin = openH * 60 + openM;
    const closeTotalMin = closeH * 60 + closeM;

    const candidateSlots: string[] = [];
    for (let m = openTotalMin; m + stepMinutes <= closeTotalMin; m += stepMinutes) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slotStr = `${hh}:${mm}`;

      if (hasBreak && breakStart && breakEnd) {
        if (slotStr >= breakStart && slotStr < breakEnd) {
          continue;
        }
      }

      candidateSlots.push(slotStr);
    }

    // Query existing appointments on that date
    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    const existingAppts = await prisma.appointment.findMany({
      where: {
        OR: [
          ...(professionalId ? [{ professionalId }] : []),
          ...(establishmentId ? [{ establishmentId }] : []),
        ],
        date: { gte: dayStart, lte: dayEnd },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
      },
    });

    const busyTimes = new Set(
      existingAppts.map(a => {
        const d = new Date(a.date);
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
      })
    );

    const now = new Date();
    const isToday = now.toISOString().split('T')[0] === date;
    const minTimeForToday = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);
    const minTimeStr = `${String(minTimeForToday.getHours()).padStart(2, '0')}:${String(minTimeForToday.getMinutes()).padStart(2, '0')}`;

    const availableSlots = candidateSlots.filter(slot => {
      if (busyTimes.has(slot)) return false;
      if (isToday && slot < minTimeStr) return false;
      return true;
    });

    return reply.send({
      date,
      isOpen,
      openTime,
      closeTime,
      slots: availableSlots,
      availableSlots: availableSlots,
      isClosed: !isOpen,
    });
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

      // Check if professional is ACTIVE and available
      if (data.professionalId) {
        const profUser = await prisma.user.findUnique({
          where: { id: data.professionalId },
          include: { professionalProfile: true }
        });
        if (!profUser || profUser.professionalProfile?.status !== 'ACTIVE') {
          return reply.status(403).send({ error: 'Profissional indisponível para agendamentos.' });
        }

        const bookingSettings = profUser.professionalProfile.bookingSettings as any;
        if (bookingSettings?.acceptOnlineBooking === false) {
          return reply.status(403).send({ error: 'Este profissional não está aceitando agendamentos online no momento.' });
        }

        const dateObj = new Date(data.date);
        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = dayKeys[dateObj.getUTCDay()];
        const workingHours = profUser.professionalProfile.workingHours as any;

        if (workingHours && workingHours[dayKey]) {
          const config = workingHours[dayKey];
          if (!config.isOpen) {
            return reply.status(409).send({ error: 'O profissional não atende neste dia da semana.' });
          }
          const timeStr = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
          if (timeStr < config.open || timeStr >= config.close) {
            return reply.status(409).send({ error: `Horário fora do expediente do profissional (${config.open} às ${config.close}).` });
          }
          if (config.hasBreak && config.breakStart && config.breakEnd) {
            if (timeStr >= config.breakStart && timeStr < config.breakEnd) {
              return reply.status(409).send({ error: 'Horário coincide com o intervalo de atendimento do profissional.' });
            }
          }
        }
      }

      // Check appointment conflicts
      const existing = await prisma.appointment.findFirst({
        where: {
          OR: [
            ...(data.professionalId ? [{ professionalId: data.professionalId, date: data.date }] : []),
            { establishmentId: data.establishmentId, date: data.date },
          ],
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] }
        }
      });

      if (existing) {
        return reply.status(409).send({ error: 'Horário já ocupado por outro agendamento.' });
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
