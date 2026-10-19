import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';
import { normalizeSpecies, SPECIES_LABELS, isPetCompatibleWithService, isPetCompatibleWithProvider } from '../utils/species';
import { calculateCashback, normalizeCashbackCode } from '../utils/cashback';
import { createAndEmitNotification } from '../utils/notificationEvents';
import { partnerProgramService } from '../services/partner-program.service';
import {
  BRAZIL_TIMEZONE,
  getBrasiliaNow,
  getBrasiliaToday,
  isTodayInBrasilia,
  isDatePastInBrasilia,
  parseTimeToMinutes,
  minutesToTime,
  getDayKeysForDate,
} from '../utils/date';
import {
  calculateDayAvailability,
  resolveServiceDuration,
} from '../services/availability.service';

const createAppointmentSchema = z.object({
  petId: z.string(),
  serviceId: z.string(),
  establishmentId: z.string(),
  professionalId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  date: z.string().datetime(), // e.g. "2026-10-10T14:00:00Z"
  paymentMethod: z.string()
    .trim()
    .min(1, { message: 'Forma de pagamento é obrigatória.' }),
  needsChange: z.boolean().optional().default(false),
  changeFor: z.number().positive().optional().nullable(),
  cashbackCode: z.string().optional().nullable(),
  petTransport: z.enum(['PICKUP_BY_TUTOR', 'PICKUP_BY_PROVIDER']).optional().default('PICKUP_BY_TUTOR'),
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
        review: true,
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
        review: apt.review ? {
          id: apt.review.id,
          rating: apt.review.rating,
          comment: apt.review.comment,
          createdAt: apt.review.createdAt,
        } : null,
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

  async getAvailableSlots(
    request: FastifyRequest<{
      Querystring: {
        date?: string;
        professionalId?: string;
        establishmentId?: string;
        serviceId?: string;
        employeeId?: string;
        simulatedNowMinutes?: string;
        simulatedDateStr?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { date, professionalId, establishmentId, serviceId, employeeId, simulatedNowMinutes, simulatedDateStr } = request.query;

    if (!date) {
      return reply.status(400).send({ error: 'Data é obrigatória (formato YYYY-MM-DD).' });
    }

    const dateParts = date.split('-');
    if (dateParts.length !== 3) {
      return reply.status(400).send({ error: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    const user = request.user as any;
    const tutorId = user?.sub || undefined;

    const result = await calculateDayAvailability({
      date,
      establishmentId,
      professionalId,
      serviceId,
      employeeId,
      tutorId,
      simulatedNowMinutes: simulatedNowMinutes ? parseInt(simulatedNowMinutes, 10) : undefined,
      simulatedDateStr,
    });

    return reply.send(result);
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

      // Fetch service to get real duration & price
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
      });
      if (!service || !service.active) {
        return reply.status(404).send({ error: 'Serviço não encontrado ou inativo.' });
      }

      // Resolve service duration adhering strictly to the precedence rules
      const durationRes = await resolveServiceDuration(data.serviceId, profUser || estUser, data.professionalId);
      const serviceDuration = durationRes.duration;

      // Parse appointment start and calculate end time
      const newStart = new Date(data.date);
      if (isNaN(newStart.getTime())) {
        return reply.status(400).send({ error: 'Data e horário do agendamento inválidos.' });
      }
      const newEnd = new Date(newStart.getTime() + serviceDuration * 60 * 1000);

      // Extract nominal Brasilia date and time
      const aptDateStr = data.date.split('T')[0];
      const startMinutes = newStart.getUTCHours() * 60 + newStart.getUTCMinutes();
      const endMinutes = startMinutes + serviceDuration;
      const startHH = String(newStart.getUTCHours()).padStart(2, '0');
      const startMM = String(newStart.getUTCMinutes()).padStart(2, '0');
      const startTimeStr = `${startHH}:${startMM}`;
      const endTimeStr = minutesToTime(endMinutes);

      // Rule 1: Cannot book past dates
      if (isDatePastInBrasilia(aptDateStr)) {
        return reply.status(400).send({ error: 'Não é possível agendar em datas passadas.' });
      }

      // Rule 2: Cannot book past hours on today's date
      const nowBrasilia = getBrasiliaNow();
      if (isTodayInBrasilia(aptDateStr)) {
        if (startMinutes <= nowBrasilia.totalMinutes) {
          return reply.status(400).send({ error: 'Não é possível agendar em horários que já passaram hoje.' });
        }

        // Rule 3: Check minimum advance notice
        const bookingSettings = (profUser?.professionalProfile?.bookingSettings || estUser?.professionalProfile?.bookingSettings) as any;
        const minAdvanceNoticeHours = Number(bookingSettings?.minAdvanceNoticeHours ?? bookingSettings?.minAdvanceHours ?? 0);
        if (minAdvanceNoticeHours > 0) {
          const minAllowedMinutes = nowBrasilia.totalMinutes + Math.round(minAdvanceNoticeHours * 60);
          if (startMinutes < minAllowedMinutes) {
            return reply.status(400).send({
              error: `O prestador requer antecedência mínima de ${minAdvanceNoticeHours}h para novos agendamentos.`,
            });
          }
        }
      }

      // Fetch pet to verify existence and check species compatibility
      const pet = await prisma.pet.findFirst({
        where: { id: data.petId, tutorId: user.sub },
      });
      if (!pet) {
        return reply.status(404).send({ error: 'Pet não encontrado.' });
      }

      const petSpeciesName = SPECIES_LABELS[normalizeSpecies(pet.species)] || pet.species;

      // 1. Compatibility Check: Pet Species vs Service animalType
      if (!isPetCompatibleWithService(pet.species, service.animalType)) {
        return reply.status(400).send({
          error: `Este serviço não está disponível para a espécie de ${pet.name} (${petSpeciesName}).`,
        });
      }

      // 2. Compatibility Check: Pet Species vs Establishment acceptedSpecies
      if (estUser.establishmentProfile) {
        if (!isPetCompatibleWithProvider(pet.species, estUser.establishmentProfile.acceptedSpecies)) {
          return reply.status(400).send({
            error: `O estabelecimento selecionado não atende a espécie de ${pet.name} (${petSpeciesName}).`,
          });
        }
      }

      // 3. Compatibility Check: Pet Species vs Professional acceptedSpecies
      const targetProfProfile = profUser?.professionalProfile || (isProfActive ? estUser.professionalProfile : null);
      if (targetProfProfile) {
        if (!isPetCompatibleWithProvider(pet.species, targetProfProfile.acceptedSpecies)) {
          return reply.status(400).send({
            error: `O profissional selecionado não atende a espécie de ${pet.name} (${petSpeciesName}).`,
          });
        }
      }

      // Check working hours and breaks
      const { dayKey, ptDayKey } = getDayKeysForDate(aptDateStr);
      const workingHours = ((profUser?.professionalProfile?.workingHours || estUser.establishmentProfile?.workingHours || estUser.professionalProfile?.workingHours)) as any;
      if (workingHours) {
        const config = workingHours[dayKey] || workingHours[ptDayKey];
        if (config) {
          const isOpen = config.enabled !== undefined ? Boolean(config.enabled) : Boolean(config.isOpen ?? true);
          if (!isOpen) {
            return reply.status(409).send({ error: 'O prestador não atende neste dia da semana.' });
          }

          if (config.open && startMinutes < parseTimeToMinutes(config.open)) {
            return reply.status(409).send({ error: `Horário antes do início do expediente (${config.open}).` });
          }
          if (config.close && endMinutes > parseTimeToMinutes(config.close)) {
            return reply.status(409).send({
              error: `O serviço (${serviceDuration} min) ultrapassa o horário de encerramento do expediente (${config.close}).`,
            });
          }
          if (config.hasBreak && config.breakStart && config.breakEnd) {
            const breakStartMin = parseTimeToMinutes(config.breakStart);
            const breakEndMin = parseTimeToMinutes(config.breakEnd);
            if (startMinutes < breakEndMin && endMinutes > breakStartMin) {
              return reply.status(409).send({
                error: `Horário coincide com o intervalo de atendimento do prestador (${config.breakStart} às ${config.breakEnd}).`,
              });
            }
          }
        }
      }

      const servicePrice = service.price || 0;
      const subtotalAmount = servicePrice;
      const isCash = (data.paymentMethod || '').toLowerCase().includes('dinheiro') || (data.paymentMethod || '').toUpperCase() === 'CASH';

      // Atomic transaction: conflict checks & creation under strict concurrency protection
      const appointment = await prisma.$transaction(async (tx) => {
        // Deterministic resource locking via PostgreSQL advisory transaction locks
        // Prevents race conditions and double-booking between concurrent requests
        const lockKeys: string[] = [
          `tutor_${user.sub}_${aptDateStr}`,
          data.professionalId ? `prof_${data.professionalId}_${aptDateStr}` : null,
          data.establishmentId ? `estab_${data.establishmentId}_${aptDateStr}` : null,
          data.employeeId ? `emp_${data.employeeId}_${aptDateStr}` : null,
        ].filter((k): k is string => Boolean(k));

        // Sort keys deterministically to strictly prevent deadlocks
        lockKeys.sort();

        for (const key of lockKeys) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(('x' || substr(md5(${key}), 1, 16))::bit(64)::bigint)`;
        }

        const dayStart = new Date(`${aptDateStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${aptDateStr}T23:59:59.999Z`);

        // Query all active appointments on this day that could conflict
        const conflictingAppts = await tx.appointment.findMany({
          where: {
            OR: [
              { tutorId: user.sub },
              ...(data.professionalId ? [{ professionalId: data.professionalId }] : []),
              { establishmentId: data.establishmentId },
            ],
            date: { gte: dayStart, lte: dayEnd },
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          },
          include: { service: true, employee: true },
        });

        // 1. Tutor collision check
        for (const apt of conflictingAppts.filter(a => a.tutorId === user.sub)) {
          const d = new Date(apt.date);
          const aptStartMin = d.getUTCHours() * 60 + d.getUTCMinutes();
          const aptDur = apt.service?.duration || 60;
          const aptEndMin = aptStartMin + aptDur;
          if (startMinutes < aptEndMin && endMinutes > aptStartMin) {
            throw new Error('CONFLICT: Você já possui outro agendamento nesse mesmo horário.');
          }
        }

        // 2. Professional collision check
        if (data.professionalId) {
          for (const apt of conflictingAppts.filter(a => a.professionalId === data.professionalId)) {
            const d = new Date(apt.date);
            const aptStartMin = d.getUTCHours() * 60 + d.getUTCMinutes();
            const aptDur = apt.service?.duration || 60;
            const aptEndMin = aptStartMin + aptDur;
            if (startMinutes < aptEndMin && endMinutes > aptStartMin) {
              throw new Error('CONFLICT: Este horário acabou de ser ocupado com o profissional selecionado.');
            }
          }
        }

        // 3. Employee collision check
        if (data.employeeId) {
          for (const apt of conflictingAppts.filter(a => a.employeeId === data.employeeId)) {
            const d = new Date(apt.date);
            const aptStartMin = d.getUTCHours() * 60 + d.getUTCMinutes();
            const aptDur = apt.service?.duration || 60;
            const aptEndMin = aptStartMin + aptDur;
            if (startMinutes < aptEndMin && endMinutes > aptStartMin) {
              throw new Error('CONFLICT: Este funcionário já possui um atendimento agendado nesse horário.');
            }
          }
        }

        // 4. Establishment capacity check (when no specific professional or employee chosen)
        if (!data.professionalId && !data.employeeId) {
          const establishmentOverlaps = conflictingAppts.filter(a => {
            if (a.establishmentId !== data.establishmentId) return false;
            const d = new Date(a.date);
            const aptStartMin = d.getUTCHours() * 60 + d.getUTCMinutes();
            const aptDur = a.service?.duration || 60;
            const aptEndMin = aptStartMin + aptDur;
            return startMinutes < aptEndMin && endMinutes > aptStartMin;
          });

          // Fetch eligible employees for this specific service
          const svcWithEmployees = await tx.service.findUnique({
            where: { id: data.serviceId },
            include: { employees: { include: { employee: true } } },
          });

          let activeEmployees: any[] = [];
          if (svcWithEmployees?.employees && svcWithEmployees.employees.length > 0) {
            activeEmployees = svcWithEmployees.employees
              .map(se => se.employee)
              .filter(e => e.active);
          }

          if (activeEmployees.length === 0) {
            activeEmployees = await tx.employee.findMany({
              where: { establishmentId: data.establishmentId, active: true },
            });
          }

          if (activeEmployees.length > 0) {
            const busyEmpIds = new Set<string>();
            let unassigned = 0;
            for (const apt of establishmentOverlaps) {
              if (apt.employeeId && activeEmployees.some(e => e.id === apt.employeeId)) {
                busyEmpIds.add(apt.employeeId);
              } else if (!apt.employeeId) {
                unassigned++;
              }
            }
            if ((busyEmpIds.size + unassigned) >= activeEmployees.length) {
              throw new Error('CONFLICT: Todos os profissionais do estabelecimento já estão ocupados neste horário.');
            }
          } else {
            if (establishmentOverlaps.length >= 1) {
              throw new Error('CONFLICT: Este horário acabou de ser reservado por outro cliente.');
            }
          }
        }

        // Process Cashback / Voucher
        let appliedVoucherId: string | null = null;
        let appliedVoucherCode: string | null = null;
        let cashbackDiscount = 0;

        if (data.cashbackCode) {
          const normalized = normalizeCashbackCode(data.cashbackCode);
          const voucher = await tx.cashbackVoucher.findUnique({
            where: { code: normalized },
          });

          if (!voucher) {
            throw new Error('Código de cashback inválido ou inexistente.');
          }
          if (voucher.tutorId !== user.sub) {
            throw new Error('Este código de cashback não pertence a esta conta.');
          }
          if (voucher.status !== 'ACTIVE') {
            throw new Error('Este código de cashback já foi utilizado ou não está disponível.');
          }

          cashbackDiscount = Math.min(voucher.amount, subtotalAmount);
          appliedVoucherId = voucher.id;
          appliedVoucherCode = voucher.code;
        }

        const finalAmount = Math.max(0, Math.round((subtotalAmount - cashbackDiscount) * 100) / 100);

        if (isCash && data.needsChange) {
          if (!data.changeFor || data.changeFor < finalAmount) {
            throw new Error(
              `O valor para troco (R$ ${data.changeFor?.toFixed(2) || 0}) deve ser maior ou igual ao total a pagar (R$ ${finalAmount.toFixed(2)}).`
            );
          }
        }

        const apt = await tx.appointment.create({
          data: {
            tutorId: user.sub,
            petId: data.petId,
            serviceId: data.serviceId,
            establishmentId: data.establishmentId,
            professionalId: data.professionalId || null,
            employeeId: data.employeeId || null,
            date: newStart,
            status: AppointmentStatus.PENDING,
            paymentMethod: data.paymentMethod,
            paymentStatus: 'PENDING',
            totalAmount: subtotalAmount,
            discountAmount: cashbackDiscount,
            cashbackCodeApplied: appliedVoucherCode,
            cashbackDiscount: cashbackDiscount,
            finalAmount: finalAmount,
            needsChange: isCash ? !!data.needsChange : false,
            changeFor: isCash && data.needsChange ? data.changeFor : null,
            cashbackCredited: false,
            petTransport: data.petTransport || 'PICKUP_BY_TUTOR',
          },
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
          }
        });

        if (appliedVoucherId) {
          await tx.cashbackVoucher.update({
            where: { id: appliedVoucherId },
            data: {
              status: 'USED',
              usedAt: new Date(),
              appointmentId: apt.id,
            }
          });
        }

        return apt;
      });

      // Generate standardized notifications
      await createAndEmitNotification({
        userId: data.establishmentId,
        title: 'Novo agendamento de serviço',
        message: 'Você tem um novo agendamento de serviço.',
        type: 'APPOINTMENT',
        appointmentId: appointment.id,
      });

      if (data.professionalId && data.professionalId !== data.establishmentId) {
        await createAndEmitNotification({
          userId: data.professionalId,
          title: 'Novo agendamento de serviço',
          message: 'Você tem um novo agendamento de serviço.',
          type: 'APPOINTMENT',
          appointmentId: appointment.id,
        });
      }

      // Synchronize with Google Calendar (idempotent, asynchronous, non-blocking)
      googleCalendarService.syncAppointment(appointment.id, 'CREATE').catch((syncErr) => {
        request.log.error('Google Calendar initial sync error:', syncErr.message);
      });

      return reply.status(201).send(appointment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues });
      }
      if (error?.message?.startsWith('CONFLICT:')) {
        return reply.status(409).send({ error: error.message.replace('CONFLICT:', '').trim() });
      }
      request.log.error(error);
      return reply.status(500).send({ error: error?.message || 'Erro interno no servidor' });
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

    if (existing.status === AppointmentStatus.CANCELLED && data.status !== AppointmentStatus.CANCELLED) {
      return reply.status(400).send({ error: 'Não é permitido reativar um agendamento cancelado.' });
    }

    if (existing.status === AppointmentStatus.COMPLETED && data.status !== AppointmentStatus.COMPLETED) {
      return reply.status(400).send({ error: 'Não é permitido alterar o status de um agendamento já concluído.' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.status === AppointmentStatus.CANCELLED ? {
          paymentStatus: existing.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED',
        } : {}),
      },
      include: {
        pet: true,
        service: true,
      }
    });

    if (data.status === AppointmentStatus.COMPLETED) {
      try {
        await partnerProgramService.processAppointmentPayout(appointment.id);
      } catch (payoutErr) {
        request.log.warn({ err: payoutErr }, 'Error processing partner payout on appointment status update');
      }
    }

    // If cancelled and voucher was used, restore the voucher
    if (data.status === AppointmentStatus.CANCELLED && existing.cashbackCodeApplied) {
      try {
        await prisma.cashbackVoucher.updateMany({
          where: {
            code: existing.cashbackCodeApplied,
            status: 'USED',
            appointmentId: existing.id,
          },
          data: {
            status: 'ACTIVE',
            usedAt: null,
            appointmentId: null,
          }
        });
      } catch (voucherErr) {
        request.log.error(voucherErr, 'Error restoring cashback voucher on cancellation');
      }
    }

    // Notify parties about status change
    try {
      let notifTitle = 'Agendamento atualizado';
      let notifMsg = 'Um agendamento de serviço recebeu uma nova atualização.';

      if (data.status === AppointmentStatus.CONFIRMED) {
        notifTitle = 'Agendamento confirmado';
        notifMsg = 'Seu agendamento de serviço foi confirmado.';
      } else if (data.status === AppointmentStatus.CANCELLED) {
        notifTitle = 'Agendamento cancelado';
        notifMsg = 'Um agendamento de serviço foi cancelado.';
      } else if (data.status === AppointmentStatus.COMPLETED) {
        notifTitle = 'Serviço concluído';
        notifMsg = 'O atendimento de serviço foi concluído com sucesso.';
      }

      // If tutor updated (e.g. cancelled), notify establishment & professional
      if (isOwner) {
        await createAndEmitNotification({
          userId: existing.establishmentId,
          title: notifTitle,
          message: notifMsg,
          type: 'APPOINTMENT',
          appointmentId: appointment.id,
        });
        if (existing.professionalId && existing.professionalId !== existing.establishmentId) {
          await createAndEmitNotification({
            userId: existing.professionalId,
            title: notifTitle,
            message: notifMsg,
            type: 'APPOINTMENT',
            appointmentId: appointment.id,
          });
        }
      } else {
        // Provider updated, notify tutor
        await createAndEmitNotification({
          userId: existing.tutorId,
          title: notifTitle,
          message: notifMsg,
          type: 'APPOINTMENT',
          appointmentId: appointment.id,
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
  },

  async confirmCompletion(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        pet: true,
        establishment: { include: { establishmentProfile: true } },
        professional: { include: { professionalProfile: true } },
      },
    });

    if (!appointment) {
      return reply.status(404).send({ error: 'Agendamento não encontrado.' });
    }

    if (appointment.tutorId !== user.sub) {
      return reply.status(403).send({ error: 'Apenas o tutor responsável pode confirmar a realização do serviço.' });
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return reply.status(400).send({ error: 'Não é possível confirmar um agendamento cancelado.' });
    }

    // Idempotency: if already credited, return without re-crediting
    if (appointment.cashbackCredited) {
      return reply.send({
        message: 'Agendamento já confirmado anteriormente.',
        appointment,
        cashbackCredited: true,
        cashbackAmount: appointment.cashbackAmountCredited || 0,
      });
    }

    // Calculate cashback: 5% on eligible amount (finalAmount or totalAmount - cashbackDiscount)
    const eligibleAmount = appointment.finalAmount ?? Math.max(0, (appointment.totalAmount || 0) - (appointment.cashbackDiscount || 0));
    const cashbackCalc = calculateCashback(eligibleAmount, 'SERVICE');
    const cashbackAmount = cashbackCalc.cashbackAmount;

    const result = await prisma.$transaction(async (tx) => {
      if (cashbackAmount > 0) {
        await tx.cashbackTransaction.create({
          data: {
            userId: appointment.tutorId,
            type: 'EARNED',
            amount: cashbackAmount,
            originType: 'SERVICE',
            appointmentId: appointment.id,
            rate: 0.05,
            eligibleAmount: eligibleAmount,
            description: `Cashback 5% - Serviço ${appointment.service?.name || 'Veterinário/Estética'}`,
          },
        });
      }

      const updatedAppointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.COMPLETED,
          confirmedByTutor: true,
          confirmedByTutorAt: new Date(),
          cashbackCredited: true,
          cashbackAmountCredited: cashbackAmount,
        },
        include: {
          service: true,
          pet: true,
        },
      });

      // Process partner payout if eligible, completed and paid
      await partnerProgramService.processAppointmentPayout(appointment.id, tx);

      return { updatedAppointment, cashbackAmount };
    });

    if (result.cashbackAmount > 0) {
      await createAndEmitNotification({
        userId: appointment.tutorId,
        title: 'Cashback creditado',
        message: 'Você recebeu cashback pela realização de um serviço.',
        type: 'CASHBACK',
      });
    }

    return reply.send({
      message: 'Agendamento concluído e cashback creditado com sucesso!',
      appointment: result.updatedAppointment,
      cashbackCredited: true,
      cashbackAmount: result.cashbackAmount,
    });
  },

  async registerPayment(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const { id } = request.params;

    const paymentSchema = z.object({
      paymentStatus: z.enum(['PAID', 'REFUNDED', 'PENDING']).default('PAID'),
      paymentMethod: z.string().trim().optional(),
      notes: z.string().trim().max(500).optional(),
    });

    const data = paymentSchema.parse(request.body || {});

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        tutor: true,
        establishment: true,
        professional: true,
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Agendamento não encontrado.' });
    }

    const isAdmin = user.role === 'ADMIN';
    const isEstablishmentOwner = existing.establishmentId === user.sub;
    const isAssignedProf = existing.professionalId === user.sub;

    if (!isAdmin && !isEstablishmentOwner && !isAssignedProf) {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o prestador responsável ou administrador pode registrar o pagamento.' });
    }

    if (existing.status === AppointmentStatus.CANCELLED && data.paymentStatus === 'PAID') {
      return reply.status(400).send({ error: 'Não é possível registrar pagamento para um agendamento cancelado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        paymentStatus: data.paymentStatus,
        ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
      },
      include: {
        service: true,
        pet: true,
        tutor: true,
      },
    });

    // If marked as PAID and operational status is COMPLETED, trigger partner payout if eligible
    if (data.paymentStatus === 'PAID' && updated.status === AppointmentStatus.COMPLETED) {
      try {
        await partnerProgramService.processAppointmentPayout(updated.id);
      } catch (payoutErr) {
        request.log.warn({ err: payoutErr }, 'Error processing partner payout on payment registration');
      }
    }

    // Emit notification to tutor about payment confirmation
    if (data.paymentStatus === 'PAID') {
      try {
        const val = updated.finalAmount ?? updated.service?.price ?? 0;
        await createAndEmitNotification({
          userId: existing.tutorId,
          title: 'Pagamento confirmado',
          message: `O pagamento do serviço "${existing.service?.name || 'Agendamento'}" no valor de R$ ${val.toFixed(2)} foi confirmado.`,
          type: 'APPOINTMENT',
          appointmentId: updated.id,
        });
      } catch (notifErr) {
        request.log.warn({ err: notifErr }, 'Error emitting payment notification');
      }
    }

    return reply.send({
      success: true,
      message: data.paymentStatus === 'PAID' ? 'Pagamento registrado com sucesso.' : 'Status financeiro atualizado.',
      appointment: updated,
    });
  },
};
