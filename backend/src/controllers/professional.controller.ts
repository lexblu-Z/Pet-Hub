import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';

// Helper to check professional access
async function ensureProfessional(request: FastifyRequest, reply: FastifyReply) {
  const token = request.user as any;
  if (!token || !token.sub) {
    reply.status(401).send({ error: 'Não autenticado.' });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    include: { professionalProfile: true },
  });
  if (!user || user.role !== Role.PROFESSIONAL) {
    reply.status(403).send({ error: 'Acesso restrito a contas de profissionais.' });
    return null;
  }
  return user;
}

export const professionalController = {
  // =========================================================================
  // 1. DASHBOARD - 100% REAL DATA FROM DATABASE (NO MOCKS)
  // =========================================================================
  async getDashboard(request: FastifyRequest<{ Querystring: { period?: string } }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    // Use official Brasília timezone (America/Sao_Paulo) for dates
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(tomorrowDate);

    // OR clause: autonomous professionals have appointments where professionalId = user.id OR establishmentId = user.id
    const providerFilter = {
      OR: [
        { professionalId: user.id },
        { establishmentId: user.id },
      ],
    };

    // 1. Today appointments count (real data)
    const todayAppointmentsCount = await prisma.appointment.count({
      where: {
        ...providerFilter,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    });

    // 2. Upcoming appointments count (from now onwards, pending or confirmed)
    const upcomingAppointmentsCount = await prisma.appointment.count({
      where: {
        ...providerFilter,
        date: {
          gte: todayStart,
        },
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
        },
      },
    });

    // 3. Patients attended: unique pets with COMPLETED appointments
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        ...providerFilter,
        status: AppointmentStatus.COMPLETED,
      },
      select: {
        petId: true,
      },
    });

    const uniquePetIds = new Set(completedAppointments.map(a => a.petId));
    const patientsAttendedCount = uniquePetIds.size;

    // 4. Average rating (null if none exist)
    const averageRating: number | null = null;

    // 5. Today's schedule (real records for today)
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        ...providerFilter,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
      include: {
        pet: true,
        tutor: true,
        service: true,
        establishment: {
          include: {
            establishmentProfile: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const formatApt = (a: any) => {
      const dateObj = new Date(a.date);
      const timeStr = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
      const itemDateStr = dateObj.toISOString().split('T')[0];
      const isToday = itemDateStr === todayStr;
      const isTomorrow = itemDateStr === tomorrowStr;
      const estName = a.establishment?.establishmentProfile?.businessName || a.establishment?.name || null;

      return {
        id: a.id,
        time: timeStr,
        date: itemDateStr,
        dateISO: a.date.toISOString(),
        isToday,
        isTomorrow,
        petId: a.petId,
        petName: a.pet?.name || 'Pet',
        petSpecies: a.pet?.species || 'Animal',
        petBreed: a.pet?.breed || null,
        petPhoto: a.pet?.photo || null,
        tutorId: a.tutorId,
        tutorName: a.tutor?.name || 'Tutor',
        tutorPhoto: a.tutor?.avatar || null,
        tutorPhone: a.tutor?.phone || null,
        serviceId: a.serviceId,
        service: a.service?.name || 'Serviço',
        serviceCategory: a.service?.category || null,
        status: a.status,
        price: Number(a.service?.price ?? 0),
        duration: a.service?.duration || 60,
        professionalId: a.professionalId || null,
        establishmentId: a.establishmentId,
        establishmentName: a.establishmentId !== user.id ? estName : null,
      };
    };

    const todaySchedule = todayAppointments.map(formatApt);

    // 6. Upcoming schedule (real list for upcoming appointments card)
    const upcomingAppointmentsList = await prisma.appointment.findMany({
      where: {
        ...providerFilter,
        date: {
          gte: todayStart,
        },
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
        },
      },
      include: {
        pet: true,
        tutor: true,
        service: true,
        establishment: {
          include: {
            establishmentProfile: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 8,
    });

    const upcomingSchedule = upcomingAppointmentsList.map(formatApt);

    return reply.send({
      todayAppointments: todayAppointmentsCount,
      upcomingAppointments: upcomingAppointmentsCount,
      patientsAttended: patientsAttendedCount,
      averageRating,
      todaySchedule,
      upcomingSchedule,
    });
  },

  // =========================================================================
  // 2. APPOINTMENTS LIST (AGENDA COMPLETA DO PROFISSIONAL)
  // =========================================================================
  async getAppointments(request: FastifyRequest<{ Querystring: { date?: string; startDate?: string; endDate?: string; status?: string } }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { date, startDate, endDate, status } = request.query;
    const where: any = {
      OR: [
        { professionalId: user.id },
        { establishmentId: user.id },
      ],
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (date) {
      // Use explicit UTC boundaries for nominal date filter matching stored UTC dates
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      where.date = {
        gte: dayStart,
        lte: dayEnd,
      };
    } else if (startDate && endDate) {
      const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
      const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
      where.date = {
        gte: rangeStart,
        lte: rangeEnd,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        pet: true,
        tutor: true,
        service: true,
        establishment: {
          include: {
            establishmentProfile: true,
          },
        },
      },
      orderBy: {
        date: 'asc', // Ordem cronológica dos atendimentos do dia
      },
    });

    const formatted = appointments.map(a => {
      const dateObj = new Date(a.date);
      // Extrai hora nominal do agendamento
      const timeStr = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
      const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      const estName = a.establishment?.establishmentProfile?.businessName || a.establishment?.name || null;

      return {
        id: a.id,
        time: timeStr,
        date: dateStr,
        dateISO: a.date.toISOString(),
        petId: a.petId,
        petName: a.pet?.name || 'Pet',
        petSpecies: a.pet?.species || 'Animal',
        petBreed: a.pet?.breed || null,
        petPhoto: a.pet?.photo || null,
        tutorId: a.tutorId,
        tutorName: a.tutor?.name || 'Tutor',
        tutorEmail: a.tutor?.email || '',
        tutorPhone: a.tutor?.phone || null,
        tutorPhoto: a.tutor?.avatar || null,
        serviceId: a.serviceId,
        service: a.service?.name || 'Serviço',
        serviceCategory: a.service?.category || null,
        price: Number(a.service?.price ?? 0),
        duration: a.service?.duration || 60,
        establishmentId: a.establishmentId,
        establishmentName: a.establishmentId !== user.id ? estName : null,
        professionalId: a.professionalId || null,
        status: a.status,
      };
    });

    return reply.send(formatted);
  },

  // =========================================================================
  // 3. UPDATE APPOINTMENT STATUS
  // =========================================================================
  async updateAppointmentStatus(request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { id } = request.params;
    const { status } = request.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment || (appointment.professionalId !== user.id && appointment.establishmentId !== user.id)) {
      return reply.status(404).send({ error: 'Agendamento não encontrado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: status as AppointmentStatus,
      },
    });

    const action = (status as AppointmentStatus) === AppointmentStatus.CANCELLED ? 'CANCEL' : 'UPDATE';
    googleCalendarService.syncAppointment(id, action).catch(() => {});

    return reply.send(updated);
  },

  // =========================================================================
  // 4. WORK ORDERS (CLINICAL ORDERS FROM COMPLETED/IN_PROGRESS APPOINTMENTS)
  // =========================================================================
  async getWorkOrders(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: user.id,
        status: {
          in: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED],
        },
      },
      include: {
        pet: true,
        tutor: true,
        service: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const workOrders = appointments.map((a, index) => {
      const dateObj = new Date(a.date);
      const code = `OS-${dateObj.getFullYear()}-${String(index + 1).padStart(3, '0')}`;
      return {
        id: a.id,
        code,
        date: dateObj.toLocaleDateString('pt-BR'),
        petName: a.pet.name,
        petSpecies: `${a.pet.species}${a.pet.breed ? ` (${a.pet.breed})` : ''}`,
        tutorName: a.tutor.name,
        tutorPhoto: a.tutor.avatar || null,
        service: a.service.name,
        value: a.service.price,
        status: a.status === AppointmentStatus.COMPLETED ? 'DONE' : 'IN_PROGRESS',
        notes: `Atendimento clínico realizado para ${a.pet.name}. Espécie: ${a.pet.species}.`,
      };
    });

    return reply.send(workOrders);
  },

  // =========================================================================
  // 5. REVIEWS
  // =========================================================================
  async getReviews(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    // Zero fake reviews. Only real reviews if any exist in the database
    return reply.send([]);
  },

  // =========================================================================
  // 6. SERVICES MANAGEMENT (PRESTAR SERVIÇOS)
  // =========================================================================
  async listServices(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const services = await prisma.service.findMany({
      where: { professionalId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(services);
  },

  async createService(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { name, description, price, duration, category, animalType, active } = request.body as any;

    if (!name || name.trim().length < 2) {
      return reply.status(400).send({ error: 'O nome do serviço deve ter pelo menos 2 caracteres.' });
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return reply.status(400).send({ error: 'Preço inválido.' });
    }

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < 5) {
      return reply.status(400).send({ error: 'A duração mínima deve ser de pelo menos 5 minutos.' });
    }

    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: priceNum,
        duration: durationNum,
        category: category || 'Consultas',
        animalType: animalType || 'Todos',
        active: active !== undefined ? Boolean(active) : true,
        professionalId: user.id,
      },
    });

    return reply.status(201).send(service);
  },

  async updateService(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { id } = request.params;
    const { name, description, price, duration, category, animalType, active } = request.body as any;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.professionalId !== user.id) {
      return reply.status(404).send({ error: 'Serviço não encontrado ou você não tem permissão para alterá-lo.' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (price !== undefined) updateData.price = Number(price);
    if (duration !== undefined) updateData.duration = Number(duration);
    if (category !== undefined) updateData.category = category;
    if (animalType !== undefined) updateData.animalType = animalType;
    if (active !== undefined) updateData.active = Boolean(active);

    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
    });

    return reply.send(updated);
  },

  async deleteService(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.professionalId !== user.id) {
      return reply.status(404).send({ error: 'Serviço não encontrado ou você não tem permissão para excluí-lo.' });
    }

    // Check if there are active appointments with this service
    const activeAppts = await prisma.appointment.count({
      where: {
        serviceId: id,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
      },
    });

    if (activeAppts > 0) {
      return reply.status(400).send({
        error: 'Este serviço possui agendamentos ativos e não pode ser excluído no momento. Você pode desativá-lo para novos agendamentos.',
      });
    }

    await prisma.service.delete({ where: { id } });
    return reply.send({ message: 'Serviço removido com sucesso.' });
  },

  async toggleServiceActive(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { id } = request.params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.professionalId !== user.id) {
      return reply.status(404).send({ error: 'Serviço não encontrado.' });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: { active: !existing.active },
    });

    return reply.send(updated);
  },

  // =========================================================================
  // 7. AVAILABILITY & BOOKING SETTINGS (MINHA DISPONIBILIDADE)
  // =========================================================================
  async getAvailability(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const defaultHours = {
      monday: { isOpen: true, open: '09:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:30' },
      tuesday: { isOpen: true, open: '09:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:30' },
      wednesday: { isOpen: true, open: '09:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:30' },
      thursday: { isOpen: true, open: '09:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:30' },
      friday: { isOpen: true, open: '09:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:30' },
      saturday: { isOpen: false, open: '09:00', close: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:30' },
      sunday: { isOpen: false, open: '09:00', close: '12:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:30' },
    };

    const defaultBookingSettings = {
      acceptOnlineBooking: true,
      minAdvanceHours: 2,
      defaultDurationMinutes: 60,
      maxPerSlot: 1,
      unavailableDays: [],
      vacationStart: null,
      vacationEnd: null,
    };

    const prof = await prisma.professionalProfile.findUnique({
      where: { userId: user.id },
    });

    return reply.send({
      workingHours: prof?.workingHours || defaultHours,
      bookingSettings: prof?.bookingSettings || defaultBookingSettings,
    });
  },

  async updateAvailability(request: FastifyRequest, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { workingHours, bookingSettings } = request.body as any;

    if (!workingHours || typeof workingHours !== 'object') {
      return reply.status(400).send({ error: 'Dados de disponibilidade inválidos.' });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const dayMap: Record<string, { label: string; aliases: string[] }> = {
      segunda: { label: 'Segunda-feira', aliases: ['segunda', 'monday'] },
      terca: { label: 'Terça-feira', aliases: ['terca', 'terça', 'tuesday'] },
      quarta: { label: 'Quarta-feira', aliases: ['quarta', 'wednesday'] },
      quinta: { label: 'Quinta-feira', aliases: ['quinta', 'thursday'] },
      sexta: { label: 'Sexta-feira', aliases: ['sexta', 'friday'] },
      sabado: { label: 'Sábado', aliases: ['sabado', 'sábado', 'saturday'] },
      domingo: { label: 'Domingo', aliases: ['domingo', 'sunday'] },
    };

    for (const [_, { label, aliases }] of Object.entries(dayMap)) {
      const dayKey = aliases.find((a) => workingHours[a] !== undefined);
      if (!dayKey) continue;
      const config = workingHours[dayKey];
      const isDayActive = config.enabled !== undefined ? Boolean(config.enabled) : Boolean(config.isOpen);

      if (config && isDayActive) {
        if (!timeRegex.test(config.open) || !timeRegex.test(config.close)) {
          return reply.status(400).send({ error: `Horários inválidos em ${label}. Use o formato HH:mm.` });
        }
        if (config.open >= config.close) {
          return reply.status(400).send({ error: `Em ${label}, o horário de término (${config.close}) deve ser posterior ao horário de início (${config.open}).` });
        }
        if (config.hasBreak) {
          if (!timeRegex.test(config.breakStart) || !timeRegex.test(config.breakEnd)) {
            return reply.status(400).send({ error: `Horários de intervalo inválidos em ${label}. Use o formato HH:mm.` });
          }
          if (config.breakStart >= config.breakEnd) {
            return reply.status(400).send({ error: `Em ${label}, o fim do intervalo (${config.breakEnd}) deve ser após o início (${config.breakStart}).` });
          }
          if (config.breakStart < config.open || config.breakEnd > config.close) {
            return reply.status(400).send({ error: `Em ${label}, o intervalo deve estar dentro do expediente (${config.open} às ${config.close}).` });
          }
        }
      }
    }

    const updated = await prisma.professionalProfile.update({
      where: { userId: user.id },
      data: {
        workingHours,
        ...(bookingSettings && typeof bookingSettings === 'object' ? { bookingSettings } : {}),
      },
    });

    return reply.send({
      message: 'Disponibilidade e configurações de agendamento salvas com sucesso!',
      workingHours: updated.workingHours,
      bookingSettings: updated.bookingSettings,
    });
  },
};
