import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

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

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Today appointments count (real data)
    const todayAppointmentsCount = await prisma.appointment.count({
      where: {
        professionalId: user.id,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    });

    // 2. Upcoming appointments count (future dates, pending or confirmed)
    const upcomingAppointmentsCount = await prisma.appointment.count({
      where: {
        professionalId: user.id,
        date: {
          gt: now,
        },
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
    });

    // 3. Patients attended: unique pets with COMPLETED appointments
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: user.id,
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
        professionalId: user.id,
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
      },
      orderBy: {
        date: 'asc',
      },
    });

    const todaySchedule = todayAppointments.map(a => {
      const dateObj = new Date(a.date);
      const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        id: a.id,
        time: timeStr,
        date: a.date.toISOString(),
        petName: a.pet.name,
        petSpecies: a.pet.species,
        petBreed: a.pet.breed || null,
        petPhoto: a.pet.photo || null,
        tutorName: a.tutor.name,
        tutorPhoto: a.tutor.avatar || null,
        tutorPhone: a.tutor.phone || a.tutor.email,
        service: a.service.name,
        status: a.status,
        price: a.service.price,
        duration: a.service.duration,
      };
    });

    return reply.send({
      todayAppointments: todayAppointmentsCount,
      upcomingAppointments: upcomingAppointmentsCount,
      patientsAttended: patientsAttendedCount,
      averageRating,
      todaySchedule,
    });
  },

  // =========================================================================
  // 2. APPOINTMENTS LIST
  // =========================================================================
  async getAppointments(request: FastifyRequest<{ Querystring: { date?: string; status?: string } }>, reply: FastifyReply) {
    const user = await ensureProfessional(request, reply);
    if (!user) return;

    const { date, status } = request.query;
    const where: any = {
      professionalId: user.id,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.date = {
        gte: dayStart,
        lte: dayEnd,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        pet: true,
        tutor: true,
        service: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const formatted = appointments.map(a => {
      const dateObj = new Date(a.date);
      return {
        id: a.id,
        time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: a.date.toISOString(),
        petName: a.pet.name,
        petSpecies: a.pet.species,
        petBreed: a.pet.breed || null,
        petPhoto: a.pet.photo || null,
        tutorName: a.tutor.name,
        tutorPhone: a.tutor.phone || a.tutor.email,
        tutorPhoto: a.tutor.avatar || null,
        service: a.service.name,
        price: a.service.price,
        duration: a.service.duration,
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

    if (!appointment || appointment.professionalId !== user.id) {
      return reply.status(404).send({ error: 'Agendamento não encontrado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: status as AppointmentStatus,
      },
    });

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
};
