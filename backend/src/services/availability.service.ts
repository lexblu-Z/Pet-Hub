import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
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

export type DurationRuleType = 'CONFIGURED' | 'PROVIDER_DEFAULT' | 'HISTORICAL_AVERAGE' | 'SAFE_FALLBACK';

export interface ServiceDurationResolution {
  duration: number; // in minutes
  rule: DurationRuleType;
  details: string;
}

export interface SlotDetail {
  time: string;
  endTime: string;
  available: boolean;
  reason?: 'PAST' | 'BREAK' | 'OCCUPIED' | 'EXCEEDS_CLOSING' | 'ADVANCE_NOTICE_REQUIRED';
  occupiedBy?: {
    appointmentId?: string;
    petName?: string;
    serviceName?: string;
    tutorName?: string;
    employeeName?: string;
  };
}

export interface DayAvailabilityResult {
  date: string;
  isOpen: boolean;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  breakStart?: string;
  breakEnd?: string;
  serviceDuration: number;
  durationRule: DurationRuleType;
  durationDetails: string;
  slots: string[];           // Backwards-compatible alias for availableSlots
  availableSlots: string[];  // Strictly available future slots
  allSlots: SlotDetail[];    // Complete timeline for provider management views
  message?: string;
  timezone: string;
}

export interface AvailabilityQueryOptions {
  date: string;
  establishmentId?: string;
  professionalId?: string;
  serviceId?: string;
  employeeId?: string;
  tutorId?: string;
  simulatedNowMinutes?: number; // Optional: for automated testing/simulation
  simulatedDateStr?: string;    // Optional: for automated testing/simulation
}

/**
 * Resolves the effective service duration adhering strictly to the 4-tier precedence:
 * 1. Explicitly configured duration on the service (service.duration)
 * 2. Provider default from bookingSettings.defaultDurationMinutes
 * 3. Historical average of completed appointments for that service
 * 4. Safe fallback (60 minutes)
 */
export async function resolveServiceDuration(
  serviceId?: string | null,
  providerUser?: any,
  professionalId?: string | null
): Promise<ServiceDurationResolution> {
  // 1. Explicit service duration
  if (serviceId) {
    try {
      const svc = await prisma.service.findUnique({ where: { id: serviceId } });
      if (svc && typeof svc.duration === 'number' && svc.duration > 0) {
        return {
          duration: svc.duration,
          rule: 'CONFIGURED',
          details: `Duração explicitamente cadastrada no serviço "${svc.name}": ${svc.duration} minutos.`,
        };
      }
    } catch {
      // Proceed to fallback tiers
    }
  }

  // 2. Provider default in bookingSettings
  const bookingSettings = providerUser?.professionalProfile?.bookingSettings as any;
  if (bookingSettings && typeof bookingSettings.defaultDurationMinutes === 'number' && bookingSettings.defaultDurationMinutes > 0) {
    return {
      duration: bookingSettings.defaultDurationMinutes,
      rule: 'PROVIDER_DEFAULT',
      details: `Duração padrão configurada pelo prestador em bookingSettings: ${bookingSettings.defaultDurationMinutes} minutos.`,
    };
  }

  // 3. Historical average from completed appointments of this service
  if (serviceId) {
    try {
      const completedAppts = await prisma.appointment.findMany({
        where: {
          serviceId,
          status: AppointmentStatus.COMPLETED,
          ...(professionalId ? { professionalId } : {}),
        },
        include: { service: true },
        take: 20,
      });

      const historicalDurations = completedAppts
        .map(a => a.service?.duration)
        .filter((d): d is number => typeof d === 'number' && d > 0);

      if (historicalDurations.length >= 3) {
        const sum = historicalDurations.reduce((acc, curr) => acc + curr, 0);
        const avg = Math.round(sum / historicalDurations.length);
        if (avg > 0) {
          return {
            duration: avg,
            rule: 'HISTORICAL_AVERAGE',
            details: `Média histórica estimada a partir de ${historicalDurations.length} atendimentos concluídos: ${avg} minutos.`,
          };
        }
      }
    } catch {
      // Proceed to safe fallback
    }
  }

  // 4. Safe fallback: 60 minutes
  return {
    duration: 60,
    rule: 'SAFE_FALLBACK',
    details: 'Duração padrão segura de fallback: 60 minutos.',
  };
}

/**
 * Calculates complete, intelligent availability for a specific day, considering:
 * - Current date & time in America/Sao_Paulo (excludes past slots)
 * - Operating hours & breaks
 * - Real service duration
 * - Existing appointments (PENDING, CONFIRMED, IN_PROGRESS)
 * - Multiple employees / staff capacity
 * - Minimum advance notice
 */
export async function calculateDayAvailability(
  options: AvailabilityQueryOptions
): Promise<DayAvailabilityResult> {
  const {
    date,
    establishmentId,
    professionalId,
    serviceId,
    employeeId,
    tutorId,
    simulatedNowMinutes,
    simulatedDateStr,
  } = options;

  const effectiveToday = simulatedDateStr || getBrasiliaToday();
  const isToday = date === effectiveToday;
  const isPastDate = date < effectiveToday;

  // Retrieve provider profile(s)
  let providerUser: any = null;
  let isProfessional = false;

  if (professionalId) {
    providerUser = await prisma.user.findUnique({
      where: { id: professionalId },
      include: { professionalProfile: true },
    });
    isProfessional = true;
  } else if (establishmentId) {
    providerUser = await prisma.user.findUnique({
      where: { id: establishmentId },
      include: { establishmentProfile: true, professionalProfile: true },
    });
    if (providerUser?.role === 'PROFESSIONAL' || (!providerUser?.establishmentProfile && providerUser?.professionalProfile)) {
      isProfessional = true;
    }
  }

  // Resolve service duration
  const durationRes = await resolveServiceDuration(serviceId, providerUser, professionalId);
  const serviceDuration = durationRes.duration;

  // Defaults
  let openTime = '08:00';
  let closeTime = '18:00';
  let hasBreak = false;
  let breakStart = '12:00';
  let breakEnd = '13:30';
  let isOpen = true;
  let minAdvanceNoticeHours = 0;
  let slotIntervalMinutes: number | null = null;

  // If date is already in the past, no slots can be offered for new booking
  if (isPastDate) {
    return {
      date,
      isOpen: false,
      isClosed: true,
      openTime,
      closeTime,
      hasBreak: false,
      serviceDuration,
      durationRule: durationRes.rule,
      durationDetails: durationRes.details,
      slots: [],
      availableSlots: [],
      allSlots: [],
      message: 'Não é possível agendar em datas passadas.',
      timezone: BRAZIL_TIMEZONE,
    };
  }

  // Check provider status & booking settings
  if (isProfessional && providerUser) {
    const profProfile = providerUser.professionalProfile;
    if (!profProfile || profProfile.status !== 'ACTIVE') {
      return {
        date,
        isOpen: false,
        isClosed: true,
        openTime,
        closeTime,
        hasBreak: false,
        serviceDuration,
        durationRule: durationRes.rule,
        durationDetails: durationRes.details,
        slots: [],
        availableSlots: [],
        allSlots: [],
        message: 'Profissional indisponível para agendamentos.',
        timezone: BRAZIL_TIMEZONE,
      };
    }

    const bookingSettings = profProfile.bookingSettings as any;
    if (bookingSettings) {
      if (bookingSettings.acceptOnlineBooking === false || bookingSettings.allowOnlineBooking === false) {
        return {
          date,
          isOpen: false,
          isClosed: true,
          openTime,
          closeTime,
          hasBreak: false,
          serviceDuration,
          durationRule: durationRes.rule,
          durationDetails: durationRes.details,
          slots: [],
          availableSlots: [],
          allSlots: [],
          message: 'Agendamentos online temporariamente desabilitados por este profissional.',
          timezone: BRAZIL_TIMEZONE,
        };
      }
      if (Array.isArray(bookingSettings.unavailableDays) && bookingSettings.unavailableDays.includes(date)) {
        return {
          date,
          isOpen: false,
          isClosed: true,
          openTime,
          closeTime,
          hasBreak: false,
          serviceDuration,
          durationRule: durationRes.rule,
          durationDetails: durationRes.details,
          slots: [],
          availableSlots: [],
          allSlots: [],
          message: 'Profissional indisponível nesta data.',
          timezone: BRAZIL_TIMEZONE,
        };
      }
      if (bookingSettings.vacationStart && bookingSettings.vacationEnd) {
        if (date >= bookingSettings.vacationStart && date <= bookingSettings.vacationEnd) {
          return {
            date,
            isOpen: false,
            isClosed: true,
            openTime,
            closeTime,
            hasBreak: false,
            serviceDuration,
            durationRule: durationRes.rule,
            durationDetails: durationRes.details,
            slots: [],
            availableSlots: [],
            allSlots: [],
            message: 'Profissional em período de recesso ou férias.',
            timezone: BRAZIL_TIMEZONE,
          };
        }
      }
      if (typeof bookingSettings.minAdvanceNoticeHours === 'number') {
        minAdvanceNoticeHours = bookingSettings.minAdvanceNoticeHours;
      } else if (typeof bookingSettings.minAdvanceHours === 'number') {
        minAdvanceNoticeHours = bookingSettings.minAdvanceHours;
      }
      if (typeof bookingSettings.slotIntervalMinutes === 'number' && bookingSettings.slotIntervalMinutes > 0) {
        slotIntervalMinutes = bookingSettings.slotIntervalMinutes;
      }
    }

    // Working hours for professional
    const workingHours = profProfile.workingHours as any;
    if (workingHours) {
      const { dayKey, ptDayKey } = getDayKeysForDate(date);
      const dayConfig = workingHours[dayKey] || workingHours[ptDayKey];
      if (dayConfig) {
        isOpen = dayConfig.enabled !== undefined ? Boolean(dayConfig.enabled) : Boolean(dayConfig.isOpen ?? true);
        if (dayConfig.open) openTime = dayConfig.open;
        if (dayConfig.close) closeTime = dayConfig.close;
        if (dayConfig.hasBreak) {
          hasBreak = true;
          breakStart = dayConfig.breakStart || '12:00';
          breakEnd = dayConfig.breakEnd || '13:30';
        }
      }
    }
  } else if (establishmentId && providerUser) {
    const estProfile = providerUser.establishmentProfile;
    if (!estProfile || estProfile.status !== 'ACTIVE') {
      return {
        date,
        isOpen: false,
        isClosed: true,
        openTime,
        closeTime,
        hasBreak: false,
        serviceDuration,
        durationRule: durationRes.rule,
        durationDetails: durationRes.details,
        slots: [],
        availableSlots: [],
        allSlots: [],
        message: 'Estabelecimento indisponível para agendamentos.',
        timezone: BRAZIL_TIMEZONE,
      };
    }

    // Working hours for establishment
    const workingHours = estProfile.workingHours as any;
    if (workingHours) {
      const { dayKey, ptDayKey } = getDayKeysForDate(date);
      const dayConfig = workingHours[dayKey] || workingHours[ptDayKey];
      if (dayConfig) {
        isOpen = dayConfig.enabled !== undefined ? Boolean(dayConfig.enabled) : Boolean(dayConfig.isOpen ?? true);
        if (dayConfig.open) openTime = dayConfig.open;
        if (dayConfig.close) closeTime = dayConfig.close;
        if (dayConfig.hasBreak) {
          hasBreak = true;
          breakStart = dayConfig.breakStart || '12:00';
          breakEnd = dayConfig.breakEnd || '13:30';
        }
      }
    }
  }

  if (!isOpen) {
    return {
      date,
      isOpen: false,
      isClosed: true,
      openTime,
      closeTime,
      hasBreak,
      breakStart,
      breakEnd,
      serviceDuration,
      durationRule: durationRes.rule,
      durationDetails: durationRes.details,
      slots: [],
      availableSlots: [],
      allSlots: [],
      message: 'Fechado neste dia.',
      timezone: BRAZIL_TIMEZONE,
    };
  }

  // Parse open and close boundaries
  const openTotalMin = parseTimeToMinutes(openTime);
  const closeTotalMin = parseTimeToMinutes(closeTime);
  const breakStartMin = hasBreak ? parseTimeToMinutes(breakStart) : -1;
  const breakEndMin = hasBreak ? parseTimeToMinutes(breakEnd) : -1;

  // Determine candidate slot step
  let stepMinutes = 60;
  if (slotIntervalMinutes && slotIntervalMinutes > 0) {
    stepMinutes = slotIntervalMinutes;
  } else if (serviceDuration <= 30) {
    stepMinutes = 30;
  } else if (serviceDuration % 30 === 0 && serviceDuration < 60) {
    stepMinutes = 30;
  } else if (serviceDuration % 60 === 0) {
    stepMinutes = 60;
  } else {
    stepMinutes = 30; // Clean 30-min standard increments
  }

  // Fetch employees and staff capacity for establishments
  let eligibleEmployees: any[] = [];
  if (establishmentId && !isProfessional) {
    if (serviceId) {
      const svcWithEmployees = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
          employees: {
            include: { employee: true },
          },
        },
      });
      if (svcWithEmployees?.employees && svcWithEmployees.employees.length > 0) {
        eligibleEmployees = svcWithEmployees.employees
          .map(se => se.employee)
          .filter(e => e.active);
      }
    }

    if (eligibleEmployees.length === 0) {
      eligibleEmployees = await prisma.employee.findMany({
        where: {
          establishmentId: providerUser?.id || establishmentId,
          active: true,
        },
      });
    }
  }

  // Query existing appointments on that date
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const existingAppts = await prisma.appointment.findMany({
    where: {
      OR: [
        ...(professionalId ? [{ professionalId }] : []),
        ...(establishmentId ? [{ establishmentId }] : []),
        ...(tutorId ? [{ tutorId }] : []),
      ],
      date: { gte: dayStart, lte: dayEnd },
      status: {
        in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      },
    },
    include: {
      service: true,
      employee: true,
      pet: true,
      tutor: true,
    },
  });

  // Real-time Brasilia clock comparison
  const now = getBrasiliaNow();
  const currentTotalMinutes = simulatedNowMinutes !== undefined ? simulatedNowMinutes : now.totalMinutes;
  const minAllowedStartMin = isToday
    ? currentTotalMinutes + Math.round(minAdvanceNoticeHours * 60)
    : 0;

  const allSlots: SlotDetail[] = [];
  const availableSlots: string[] = [];

  // Generate candidate slots
  for (let m = openTotalMin; m < closeTotalMin; m += stepMinutes) {
    const slotStartStr = minutesToTime(m);
    const slotEndMin = m + serviceDuration;
    const slotEndStr = minutesToTime(slotEndMin);

    // Rule A: Does the service duration exceed the closing time?
    if (slotEndMin > closeTotalMin) {
      allSlots.push({
        time: slotStartStr,
        endTime: slotEndStr,
        available: false,
        reason: 'EXCEEDS_CLOSING',
      });
      continue;
    }

    // Rule B: Does it overlap with break time?
    if (hasBreak && breakStartMin >= 0 && breakEndMin >= 0) {
      if (m < breakEndMin && slotEndMin > breakStartMin) {
        allSlots.push({
          time: slotStartStr,
          endTime: slotEndStr,
          available: false,
          reason: 'BREAK',
        });
        continue;
      }
    }

    // Rule C: Is this slot already in the past (for today)?
    if (isToday && m <= currentTotalMinutes) {
      allSlots.push({
        time: slotStartStr,
        endTime: slotEndStr,
        available: false,
        reason: 'PAST',
      });
      continue;
    }

    // Rule D: Does it violate minimum advance notice requirement?
    if (isToday && m < minAllowedStartMin) {
      allSlots.push({
        time: slotStartStr,
        endTime: slotEndStr,
        available: false,
        reason: 'ADVANCE_NOTICE_REQUIRED',
      });
      continue;
    }

    // Rule E: Conflict with existing appointments
    const overlapping = existingAppts.filter(apt => {
      const d = new Date(apt.date);
      const aptStartMin = d.getUTCHours() * 60 + d.getUTCMinutes();
      const aptDuration = apt.service?.duration || 60;
      const aptEndMin = aptStartMin + aptDuration;
      return m < aptEndMin && slotEndMin > aptStartMin;
    });

    let isOccupied = false;
    let occupiedInfo: SlotDetail['occupiedBy'] = undefined;

    if (overlapping.length > 0) {
      // 1. Check tutor conflict
      if (tutorId) {
        const tutorConflict = overlapping.find(apt => apt.tutorId === tutorId);
        if (tutorConflict) {
          isOccupied = true;
          occupiedInfo = {
            appointmentId: tutorConflict.id,
            petName: tutorConflict.pet?.name,
            serviceName: tutorConflict.service?.name,
          };
        }
      }

      // 2. Check professional conflict (autonomous or specifically chosen)
      if (!isOccupied && professionalId) {
        const profConflict = overlapping.find(apt => apt.professionalId === professionalId);
        if (profConflict) {
          isOccupied = true;
          occupiedInfo = {
            appointmentId: profConflict.id,
            petName: profConflict.pet?.name,
            serviceName: profConflict.service?.name,
            tutorName: profConflict.tutor?.name,
          };
        }
      }

      // 3. Check specific employee conflict
      if (!isOccupied && employeeId) {
        const empConflict = overlapping.find(apt => apt.employeeId === employeeId);
        if (empConflict) {
          isOccupied = true;
          occupiedInfo = {
            appointmentId: empConflict.id,
            petName: empConflict.pet?.name,
            serviceName: empConflict.service?.name,
            employeeName: empConflict.employee?.name,
          };
        }
      }

      // 4. Establishment capacity with multiple employees
      if (!isOccupied && establishmentId && !professionalId && !employeeId) {
        const establishmentOverlaps = overlapping.filter(apt => apt.establishmentId === establishmentId);

        if (eligibleEmployees.length > 0) {
          // Identify which eligible employees are busy during this slot
          const busyEmployeeIds = new Set<string>();
          let unassignedCount = 0;

          for (const apt of establishmentOverlaps) {
            if (apt.employeeId && eligibleEmployees.some(e => e.id === apt.employeeId)) {
              busyEmployeeIds.add(apt.employeeId);
            } else if (!apt.employeeId) {
              unassignedCount++;
            }
          }

          const totalBusyStaff = busyEmployeeIds.size + unassignedCount;
          if (totalBusyStaff >= eligibleEmployees.length) {
            isOccupied = true;
            occupiedInfo = {
              appointmentId: establishmentOverlaps[0].id,
              serviceName: establishmentOverlaps[0].service?.name,
              petName: establishmentOverlaps[0].pet?.name,
            };
          }
        } else {
          // Fallback single capacity if establishment has no registered employees
          if (establishmentOverlaps.length >= 1) {
            isOccupied = true;
            occupiedInfo = {
              appointmentId: establishmentOverlaps[0].id,
              serviceName: establishmentOverlaps[0].service?.name,
              petName: establishmentOverlaps[0].pet?.name,
            };
          }
        }
      }
    }

    if (isOccupied) {
      allSlots.push({
        time: slotStartStr,
        endTime: slotEndStr,
        available: false,
        reason: 'OCCUPIED',
        occupiedBy: occupiedInfo,
      });
      continue;
    }

    // Slot is genuinely available!
    allSlots.push({
      time: slotStartStr,
      endTime: slotEndStr,
      available: true,
    });
    availableSlots.push(slotStartStr);
  }

  let message: string | undefined = undefined;
  if (availableSlots.length === 0) {
    message = isToday
      ? 'Não há mais horários disponíveis para hoje. Por favor, selecione outra data.'
      : 'Nenhum horário disponível para esta data.';
  }

  return {
    date,
    isOpen: true,
    isClosed: false,
    openTime,
    closeTime,
    hasBreak,
    breakStart: hasBreak ? breakStart : undefined,
    breakEnd: hasBreak ? breakEnd : undefined,
    serviceDuration,
    durationRule: durationRes.rule,
    durationDetails: durationRes.details,
    slots: availableSlots,
    availableSlots,
    allSlots,
    message,
    timezone: BRAZIL_TIMEZONE,
  };
}
