import axios from 'axios';
import { prisma } from '../lib/prisma';
import { AppointmentStatus } from '@prisma/client';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret';
const sanitizeRedirectUri = (uri?: string) => (uri ? uri.replace(/[\[\]"']/g, '').trim() : 'http://localhost:3000/api/google/callback');
const REDIRECT_URI = sanitizeRedirectUri(process.env.GOOGLE_REDIRECT_URI);

export interface CalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  description?: string;
}

export const googleCalendarService = {
  // =========================================================================
  // 1. TOKEN REFRESH & MANAGEMENT
  // =========================================================================
  async ensureAccessToken(connection: any): Promise<string> {
    const now = new Date();
    const expiry = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null;

    // If token still valid for at least 5 minutes, return it
    if (expiry && expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
      return connection.accessToken;
    }

    // Refresh token if available
    if (connection.refreshToken) {
      try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: connection.refreshToken,
          grant_type: 'refresh_token',
        });

        const { access_token, expires_in } = response.data;
        const newExpiry = new Date(Date.now() + (expires_in || 3600) * 1000);

        await prisma.googleCalendarConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: access_token,
            tokenExpiresAt: newExpiry,
          },
        });

        return access_token;
      } catch (err: any) {
        console.error('Failed to refresh Google token:', err.response?.data || err.message);
        throw new Error('Falha ao renovar credencial do Google Calendar.');
      }
    }

    return connection.accessToken;
  },

  // =========================================================================
  // 2. LIST USER CALENDARS
  // =========================================================================
  async listUserCalendars(connection: any): Promise<CalendarInfo[]> {
    const token = await this.ensureAccessToken(connection);
    const response = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const items = response.data.items || [];
    return items.map((item: any) => ({
      id: item.id,
      summary: item.summary,
      primary: !!item.primary,
      description: item.description,
    }));
  },

  // =========================================================================
  // 3. CREATE DEDICATED PETHUB CALENDAR
  // =========================================================================
  async createDedicatedPetHubCalendar(connection: any): Promise<CalendarInfo> {
    const token = await this.ensureAccessToken(connection);
    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars',
      {
        summary: '🐾 PetHub — Agendamentos',
        description: 'Agenda oficial sincronizada pelo aplicativo PetHub.',
        timeZone: 'America/Sao_Paulo',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const newCalendarId = response.data.id;
    const newCalendarName = response.data.summary;

    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        calendarId: newCalendarId,
        calendarName: newCalendarName,
        lastSyncAt: new Date(),
      },
    });

    await prisma.calendarSyncLog.create({
      data: {
        connectionId: connection.id,
        action: 'CREATE_CALENDAR',
        status: 'SUCCESS',
        title: 'Agenda PetHub criada no Google Calendar',
        details: `Agenda "${newCalendarName}" configurada como destino.`,
      },
    });

    return {
      id: newCalendarId,
      summary: newCalendarName,
      primary: false,
    };
  },

  // =========================================================================
  // 4. SYNC APPOINTMENT (CREATE / UPDATE / CANCEL) - IDEMPOTENT & MULTI-USER
  // =========================================================================
  async syncAppointment(appointmentId: string, action: 'CREATE' | 'UPDATE' | 'CANCEL'): Promise<void> {
    try {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          pet: true,
          service: true,
          establishment: {
            include: { establishmentProfile: true },
          },
          tutor: true,
          professional: {
            include: { professionalProfile: true },
          },
        },
      });

      if (!appt) return;

      // Identify stakeholder IDs
      const userIds = [
        { id: appt.tutorId, role: 'TUTOR' },
        { id: appt.establishmentId, role: 'ESTABLISHMENT' },
        ...(appt.professionalId ? [{ id: appt.professionalId, role: 'PROFESSIONAL' }] : []),
      ];

      for (const { id: userId, role } of userIds) {
        await this.syncForUser(appt, userId, role, action);
      }
    } catch (globalErr: any) {
      console.error('Error during Google Calendar sync:', globalErr.message);
      // Graceful: PostgreSQL data is untouched and safely saved
    }
  },

  // Helper for single user sync
  async syncForUser(appt: any, userId: string, role: string, action: 'CREATE' | 'UPDATE' | 'CANCEL') {
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });

    if (!connection || !connection.syncEnabled) {
      return; // No connection or sync disabled
    }

    const calendarId = connection.calendarId || 'primary';

    // Check existing sync record for idempotency
    const existingSync = await prisma.calendarEventSync.findUnique({
      where: {
        appointmentId_connectionId: {
          appointmentId: appt.id,
          connectionId: connection.id,
        },
      },
    });

    let token: string;
    try {
      token = await this.ensureAccessToken(connection);
    } catch (authErr: any) {
      await prisma.calendarSyncLog.create({
        data: {
          connectionId: connection.id,
          action: 'ERROR',
          status: 'FAILED',
          title: 'Credencial expirada',
          details: 'Não foi possível renovar o token do Google Calendar.',
        },
      });
      return;
    }

    const startDate = new Date(appt.date);
    const durationMin = appt.service?.duration || 60;
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

    const establishmentName = appt.establishment?.establishmentProfile?.businessName || appt.establishment?.name || 'PetHub';
    const address = appt.establishment?.establishmentProfile?.address || 'Ourinhos - SP';

    // Build role-specific title and description
    let summary = '';
    let description = '';

    if (role === 'TUTOR') {
      summary = `🐾 ${appt.service?.name || 'Atendimento'} de ${appt.pet?.name || 'Pet'} — PetHub`;
      description = `Agendamento PetHub 🐾\n\n` +
        `Pet: ${appt.pet?.name} (${appt.pet?.species}${appt.pet?.breed ? ' • ' + appt.pet.breed : ''})\n` +
        `Serviço: ${appt.service?.name}\n` +
        `Local: ${establishmentName}\n` +
        `Endereço: ${address}\n` +
        `Profissional: ${appt.professional?.name || 'Equipe'}\n` +
        `Valor: R$ ${(appt.service?.price || 0).toFixed(2).replace('.', ',')}\n` +
        `Status: ${appt.status}`;
    } else if (role === 'PROFESSIONAL') {
      summary = `🩺 ${appt.service?.name || 'Consulta'} — ${appt.pet?.name} (Tutor: ${appt.tutor?.name})`;
      description = `Atendimento Clínico PetHub 🩺\n\n` +
        `Paciente: ${appt.pet?.name} (${appt.pet?.species}${appt.pet?.breed ? ' • ' + appt.pet.breed : ''})\n` +
        `Tutor: ${appt.tutor?.name}\n` +
        `Contato Tutor: ${appt.tutor?.phone || appt.tutor?.email}\n` +
        `Serviço: ${appt.service?.name}\n` +
        `Estabelecimento: ${establishmentName}\n` +
        `Status: ${appt.status}`;
    } else {
      // ESTABLISHMENT
      summary = `🏪 Atendimento #${appt.id.slice(0, 8).toUpperCase()} — ${appt.pet?.name} (${appt.service?.name})`;
      description = `Agendamento Estabelecimento PetHub 🏪\n\n` +
        `Pet: ${appt.pet?.name} (${appt.pet?.species})\n` +
        `Tutor: ${appt.tutor?.name} (${appt.tutor?.phone || appt.tutor?.email})\n` +
        `Profissional Responsável: ${appt.professional?.name || 'A definir'}\n` +
        `Serviço: ${appt.service?.name}\n` +
        `Valor: R$ ${(appt.service?.price || 0).toFixed(2).replace('.', ',')}\n` +
        `Status: ${appt.status}`;
    }

    const eventPayload = {
      summary,
      description,
      location: address,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    };

    try {
      // --- CANCEL ACTION ---
      if (action === 'CANCEL' || appt.status === AppointmentStatus.CANCELLED) {
        if (existingSync && existingSync.googleEventId && existingSync.syncStatus !== 'CANCELLED') {
          // Delete from Google Calendar or mark as cancelled
          try {
            await axios.delete(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingSync.googleEventId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (delErr: any) {
            // If already deleted in Google (404/410), treat as success
            if (delErr.response?.status !== 404 && delErr.response?.status !== 410) {
              throw delErr;
            }
          }

          await prisma.calendarEventSync.update({
            where: { id: existingSync.id },
            data: {
              syncStatus: 'CANCELLED',
              lastSyncedAt: new Date(),
            },
          });

          await prisma.calendarSyncLog.create({
            data: {
              connectionId: connection.id,
              action: 'EVENT_CANCELLED',
              status: 'SUCCESS',
              title: `Agendamento cancelado no Google Calendar`,
              details: `Evento de ${appt.pet?.name} removido do calendário.`,
            },
          });
        }
        return;
      }

      // --- CREATE / UPDATE ACTION ---
      if (existingSync && existingSync.googleEventId) {
        // Update existing event (Idempotent)
        await axios.put(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingSync.googleEventId}`,
          eventPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        await prisma.calendarEventSync.update({
          where: { id: existingSync.id },
          data: {
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
            lastError: null,
          },
        });

        await prisma.calendarSyncLog.create({
          data: {
            connectionId: connection.id,
            action: 'EVENT_UPDATED',
            status: 'SUCCESS',
            title: `Evento atualizado: ${appt.service?.name}`,
            details: `Sincronizado para ${startDate.toLocaleDateString('pt-BR')} às ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
          },
        });
      } else {
        // Create new event in Google Calendar
        const response = await axios.post(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          eventPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const googleEventId = response.data.id;

        await prisma.calendarEventSync.upsert({
          where: {
            appointmentId_connectionId: {
              appointmentId: appt.id,
              connectionId: connection.id,
            },
          },
          update: {
            googleEventId,
            calendarId,
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
            lastError: null,
          },
          create: {
            appointmentId: appt.id,
            connectionId: connection.id,
            googleEventId,
            calendarId,
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
          },
        });

        await prisma.calendarSyncLog.create({
          data: {
            connectionId: connection.id,
            action: 'EVENT_CREATED',
            status: 'SUCCESS',
            title: `Evento criado: ${appt.service?.name} de ${appt.pet?.name}`,
            details: `Agendado para ${startDate.toLocaleDateString('pt-BR')} às ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
          },
        });
      }

      // Update connection lastSyncAt
      await prisma.googleCalendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (syncErr: any) {
      console.error(`Google Calendar API error for user ${userId}:`, syncErr.response?.data || syncErr.message);

      // Record failed sync in database for retry without throwing
      await prisma.calendarEventSync.upsert({
        where: {
          appointmentId_connectionId: {
            appointmentId: appt.id,
            connectionId: connection.id,
          },
        },
        update: {
          syncStatus: 'FAILED',
          lastError: syncErr.response?.data?.error?.message || syncErr.message || 'Erro desconhecido',
          retryCount: { increment: 1 },
        },
        create: {
          appointmentId: appt.id,
          connectionId: connection.id,
          googleEventId: '',
          calendarId,
          syncStatus: 'FAILED',
          lastError: syncErr.response?.data?.error?.message || syncErr.message || 'Erro desconhecido',
          retryCount: 1,
        },
      });

      await prisma.calendarSyncLog.create({
        data: {
          connectionId: connection.id,
          action: 'ERROR',
          status: 'FAILED',
          title: `Não foi possível sincronizar ${appt.service?.name}`,
          details: 'Google Calendar temporariamente indisponível. O agendamento continua salvo no PetHub.',
        },
      });
    }
  },

  // =========================================================================
  // 5. SYNC ALL PENDING APPOINTMENTS FOR USER (MANUAL SYNC)
  // =========================================================================
  async syncAllPending(userId: string): Promise<{ synced: number; failed: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { googleCalendarConnection: true },
    });

    if (!user || !user.googleCalendarConnection) {
      return { synced: 0, failed: 0 };
    }

    // Find active appointments for this user
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { tutorId: userId },
          { establishmentId: userId },
          { professionalId: userId },
        ],
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
        },
      },
    });

    let synced = 0;
    let failed = 0;

    for (const appt of appointments) {
      try {
        await this.syncAppointment(appt.id, 'CREATE');
        synced++;
      } catch {
        failed++;
      }
    }

    await prisma.googleCalendarConnection.update({
      where: { id: user.googleCalendarConnection.id },
      data: { lastSyncAt: new Date() },
    });

    await prisma.calendarSyncLog.create({
      data: {
        connectionId: user.googleCalendarConnection.id,
        action: 'MANUAL_SYNC',
        status: 'SUCCESS',
        title: 'Sincronização manual executada',
        details: `${synced} agendamento(s) processado(s) com sucesso.`,
      },
    });

    return { synced, failed };
  },
};
