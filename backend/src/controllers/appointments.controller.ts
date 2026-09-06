import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';

const createAppointmentSchema = z.object({
  petId: z.string(),
  serviceId: z.string(),
  establishmentId: z.string(),
  professionalId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
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
        establishment: {
          include: {
            establishmentProfile: true,
          }
        },
        professional: {
          include: {
            professionalProfile: true,
          }
        },
      },
      orderBy: { date: 'desc' },
    });

    const formatted = appointments.map((apt) => {
      const dateObj = new Date(apt.date);
      const timeStr = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
      const dateStr = apt.date.toISOString().split('T')[0];
      const providerName =
        apt.professional?.name
          ? `Dr(a). ${apt.professional.name}`
          : apt.establishment?.establishmentProfile?.businessName || apt.establishment?.name || 'Estabelecimento';

      return {
        ...apt,
        serviceName: apt.service?.name || 'Serviço',
        serviceCategory: apt.service?.category?.toLowerCase() || 'consulta',
        establishmentName: providerName,
        petName: apt.pet?.name || 'Pet',
        date: dateStr,
        time: timeStr,
        price: apt.service?.price || 0,
      };
    });

    return reply.send(formatted);
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
      const providerUser = await prisma.user.findUnique({
        where: { id: establishmentId },
        include: { establishmentProfile: true, professionalProfile: true },
      });

      const isEstActive = providerUser?.establishmentProfile?.status === 'ACTIVE';
      const isProfActive = providerUser?.professionalProfile?.status === 'ACTIVE';

      if (!providerUser || (!isEstActive && !isProfActive)) {
        return reply.send({ date, slots: [], availableSlots: [], isClosed: true });
      }

      if (isProfActive && providerUser.professionalProfile) {
        const bookingSettings = providerUser.professionalProfile.bookingSettings as any;
        if (bookingSettings) {
          if (bookingSettings.acceptOnlineBooking === false || bookingSettings.allowOnlineBooking === false) {
            return reply.send({ date, slots: [], availableSlots: [], isClosed: true, message: 'Agendamentos online indisponíveis para este profissional.' });
          }
          if (bookingSettings.defaultDurationMinutes) {
            stepMinutes = bookingSettings.defaultDurationMinutes;
          }
          if (bookingSettings.minAdvanceNoticeHours) {
            minAdvanceHours = bookingSettings.minAdvanceNoticeHours;
          }
        }
      }

      const workingHours = (providerUser.establishmentProfile?.workingHours || providerUser.professionalProfile?.workingHours) as any;
      if (workingHours) {
        const dayConfig = workingHours[dayKey] || workingHours[ptDayKey];
        if (dayConfig) {
          isOpen = dayConfig.enabled !== undefined ? Boolean(dayConfig.enabled) : Boolean(dayConfig.isOpen);
          if (dayConfig.open) openTime = dayConfig.open;
          if (dayConfig.close) closeTime = dayConfig.close;
          if (dayConfig.hasBreak) {
            hasBreak = true;
            if (dayConfig.breakStart) breakStart = dayConfig.breakStart;
            if (dayConfig.breakEnd) breakEnd = dayConfig.breakEnd;
          }
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
      include: { service: true },
    });

    const now = new Date();
    const isToday = now.toISOString().split('T')[0] === date;
    const minTimeForToday = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);
    const minTimeStr = `${String(minTimeForToday.getHours()).padStart(2, '0')}:${String(minTimeForToday.getMinutes()).padStart(2, '0')}`;

    const availableSlots = candidateSlots.filter(slot => {
      const [sh, sm] = slot.split(':').map(Number);
      const slotStartMin = sh * 60 + sm;
      const slotEndMin = slotStartMin + stepMinutes;

      const overlapsExisting = existingAppts.some(apt => {
        if (professionalId && apt.professionalId && apt.professionalId !== professionalId) {
          return false;
        }
        const d = new Date(apt.date);
        const aptStartMin = d.getUTCHours() * 60 + d.getUTCMinutes();
        const aptDuration = apt.service?.duration || 60;
        const aptEndMin = aptStartMin + aptDuration;

        return slotStartMin < aptEndMin && slotEndMin > aptStartMin;
      });

      if (overlapsExisting) return false;
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
      
      // Check if provider (establishment or autonomous professional) is ACTIVE
      const estUser = await prisma.user.findUnique({
        where: { id: data.establishmentId },
        include: { establishmentProfile: true, professionalProfile: true }
      });
      const isEstActive = estUser?.establishmentProfile?.status === 'ACTIVE';
      const isProfActive = estUser?.professionalProfile?.status === 'ACTIVE';

      if (!estUser || (!isEstActive && !isProfActive)) {
        return reply.status(403).send({ error: 'Estabelecimento ou profissional indisponível para agendamentos.' });
      }

      if (isProfActive && !data.professionalId) {
        data.professionalId = estUser.id;
      }

      // Fetch service to get real duration & price
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
      });
      if (!service || !service.active) {
        return reply.status(404).send({ error: 'Serviço não encontrado ou inativo.' });
      }
      const serviceDuration = service.duration || 60; // in minutes

      // Parse appointment start and calculate end time
      const newStart = new Date(data.date);
      if (isNaN(newStart.getTime())) {
        return reply.status(400).send({ error: 'Data e horário do agendamento inválidos.' });
      }
      const newEnd = new Date(newStart.getTime() + serviceDuration * 60 * 1000);

      // Check if professional is ACTIVE and available
      let profUser: any = null;
      if (data.professionalId) {
        profUser = await prisma.user.findUnique({
          where: { id: data.professionalId },
          include: { professionalProfile: true }
        });
        if (!profUser || profUser.professionalProfile?.status !== 'ACTIVE') {
          return reply.status(403).send({ error: 'Profissional indisponível para agendamentos.' });
        }

        const bookingSettings = profUser.professionalProfile.bookingSettings as any;
        if (bookingSettings?.acceptOnlineBooking === false || bookingSettings?.allowOnlineBooking === false) {
          return reply.status(403).send({ error: 'Este profissional não está aceitando agendamentos online no momento.' });
        }
      }

      // Check working hours and breaks
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const ptDayKeys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const dayIdx = newStart.getUTCDay();

      const workingHours = ((profUser?.professionalProfile?.workingHours || estUser.establishmentProfile?.workingHours || estUser.professionalProfile?.workingHours)) as any;
      if (workingHours) {
        const config = workingHours[dayKeys[dayIdx]] || workingHours[ptDayKeys[dayIdx]];
        if (config) {
          const isOpen = config.enabled !== undefined ? Boolean(config.enabled) : Boolean(config.isOpen);
          if (!isOpen) {
            return reply.status(409).send({ error: 'O prestador não atende neste dia da semana.' });
          }
          const startHH = String(newStart.getUTCHours()).padStart(2, '0');
          const startMM = String(newStart.getUTCMinutes()).padStart(2, '0');
          const startTimeStr = `${startHH}:${startMM}`;

          const endHH = String(newEnd.getUTCHours()).padStart(2, '0');
          const endMM = String(newEnd.getUTCMinutes()).padStart(2, '0');
          const endTimeStr = `${endHH}:${endMM}`;

          if (config.open && startTimeStr < config.open) {
            return reply.status(409).send({ error: `Horário antes do início do expediente (${config.open}).` });
          }
          if (config.close && endTimeStr > config.close) {
            return reply.status(409).send({ error: `O serviço (${serviceDuration} min) ultrapassa o horário de encerramento (${config.close}).` });
          }
          if (config.hasBreak && config.breakStart && config.breakEnd) {
            if (startTimeStr < config.breakEnd && endTimeStr > config.breakStart) {
              return reply.status(409).send({ error: 'Horário coincide com o intervalo de atendimento do prestador.' });
            }
          }
        }
      }

      // Check tutor's OWN conflicts on this day
      // Tutor can have multiple appointments on different days, or different times on the same day.
      // Tutor is ONLY blocked if they already have an overlapping appointment.
      const dayStart = new Date(Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate(), 0, 0, 0));
      const dayEnd = new Date(Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate(), 23, 59, 59, 999));

      const tutorExisting = await prisma.appointment.findMany({
        where: {
          tutorId: user.sub,
          date: { gte: dayStart, lte: dayEnd },
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] }
        },
        include: { service: true }
      });

      for (const apt of tutorExisting) {
        const aptStart = new Date(apt.date);
        const aptDuration = apt.service?.duration || 60;
        const aptEnd = new Date(aptStart.getTime() + aptDuration * 60 * 1000);

        // Overlap check: newStart < aptEnd && newEnd > aptStart
        if (newStart < aptEnd && newEnd > aptStart) {
          return reply.status(409).send({ error: 'Você já possui um agendamento nesse horário.' });
        }
      }

      // Check provider (professional or establishment) conflicts
      const providerExisting = await prisma.appointment.findMany({
        where: {
          OR: [
            ...(data.professionalId ? [{ professionalId: data.professionalId }] : []),
            { establishmentId: data.establishmentId },
          ],
          date: { gte: dayStart, lte: dayEnd },
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] }
        },
        include: { service: true }
      });

      for (const apt of providerExisting) {
        const sameProfessional = data.professionalId && apt.professionalId === data.professionalId;
        const sameEstablishment = !data.professionalId && apt.establishmentId === data.establishmentId;

        if (sameProfessional || sameEstablishment) {
          const aptStart = new Date(apt.date);
          const aptDuration = apt.service?.duration || 60;
          const aptEnd = new Date(aptStart.getTime() + aptDuration * 60 * 1000);

          if (newStart < aptEnd && newEnd > aptStart) {
            return reply.status(409).send({ error: 'Horário já ocupado por outro agendamento.' });
          }
        }
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

      // Generate notifications
      const petName = appointment.pet?.name || 'Pet';
      const serviceName = appointment.service?.name || 'Serviço';
      const formattedDate = new Date(appointment.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

      try {
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

      if (data.professionalId && data.professionalId !== data.establishmentId) {
        try {
          await prisma.notification.create({
            data: {
              userId: data.professionalId,
              title: 'Novo agendamento recebido',
              message: `${petName} possui um serviço de ${serviceName} agendado para ${formattedDate}.`,
              type: 'APPOINTMENT',
            }
          });
        } catch (notifErr) {
          request.log.error(notifErr);
        }
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
      include: {
        pet: true,
        service: true,
      }
    });

    // Notify parties about status change
    try {
      const statusLabels: Record<string, string> = {
        CONFIRMED: 'confirmado',
        IN_PROGRESS: 'iniciado',
        COMPLETED: 'concluído',
        CANCELLED: 'cancelado',
        PENDING: 'agendado',
      };
      const label = statusLabels[data.status] || data.status.toLowerCase();
      const petName = appointment.pet?.name || 'Pet';
      const serviceName = appointment.service?.name || 'Serviço';

      // If tutor updated (e.g. cancelled), notify establishment & professional
      if (isOwner) {
        await prisma.notification.create({
          data: {
            userId: existing.establishmentId,
            title: `Agendamento ${label}`,
            message: `O agendamento de ${petName} (${serviceName}) foi marcado como ${label} pelo tutor.`,
            type: 'APPOINTMENT',
          }
        });
        if (existing.professionalId && existing.professionalId !== existing.establishmentId) {
          await prisma.notification.create({
            data: {
              userId: existing.professionalId,
              title: `Agendamento ${label}`,
              message: `O agendamento de ${petName} (${serviceName}) foi marcado como ${label} pelo tutor.`,
              type: 'APPOINTMENT',
            }
          });
        }
      } else {
        // Provider updated, notify tutor
        await prisma.notification.create({
          data: {
            userId: existing.tutorId,
            title: `Agendamento ${label}`,
            message: `O agendamento de ${petName} (${serviceName}) foi ${label}.`,
            type: 'APPOINTMENT',
          }
        });
      }
    } catch (notifErr) {
      request.log.warn({ err: notifErr }, 'Could not create notification on status change');
    }

    // Synchronize status change with Google Calendar (idempotent, asynchronous)
    const syncAction = data.status === AppointmentStatus.CANCELLED ? 'CANCEL' : 'UPDATE';
    googleCalendarService.syncAppointment(appointment.id, syncAction).catch((syncErr) => {
      request.log.error('Google Calendar status sync error:', syncErr.message);
    });

    return reply.send(appointment);
  }
};
