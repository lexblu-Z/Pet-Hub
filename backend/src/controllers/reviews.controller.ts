import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppointmentStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createAndEmitNotification } from '../utils/notificationEvents';

const createReviewSchema = z.object({
  appointmentId: z.string().uuid({ message: 'ID do agendamento inválido.' }),
  rating: z.number().int().min(1).max(5, { message: 'A nota deve ser entre 1 e 5 estrelas.' }),
  comment: z.string().trim().min(3, { message: 'O comentário deve ter no mínimo 3 caracteres.' }).max(1000, { message: 'O comentário deve ter no máximo 1000 caracteres.' }),
  petPhotoUrl: z.string().trim().optional().nullable(),
});

export const reviewsController = {
  /**
   * List reviews and compute real rating/distribution for a given establishment or professional.
   * Query: ?establishmentId=:id OR ?professionalId=:id
   */
  async list(request: FastifyRequest<{ Querystring: { establishmentId?: string; professionalId?: string } }>, reply: FastifyReply) {
    try {
      const { establishmentId, professionalId } = request.query;
      const targetId = establishmentId || professionalId;

      if (!targetId) {
        return reply.status(400).send({ error: 'Parâmetro establishmentId ou professionalId é obrigatório.' });
      }

      const reviews = await prisma.review.findMany({
        where: {
          OR: [
            { establishmentId: targetId },
            { professionalId: targetId },
          ],
        },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              avatar: true,
              defaultAvatar: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const reviewCount = reviews.length;
      let averageRating: number | null = null;
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      if (reviewCount > 0) {
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        averageRating = Math.round((sum / reviewCount) * 10) / 10;

        reviews.forEach((r) => {
          const star = Math.min(Math.max(r.rating, 1), 5) as 1 | 2 | 3 | 4 | 5;
          distribution[star] = (distribution[star] || 0) + 1;
        });
      }

      const mappedReviews = reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        petPhotoUrl: r.petPhotoUrl,
        reply: r.reply,
        replyCreatedAt: r.replyCreatedAt,
        createdAt: r.createdAt,
        serviceName: r.service?.name || 'Serviço',
        tutor: {
          id: r.tutor.id,
          name: r.tutor.name,
          avatar: r.tutor.avatar || r.tutor.defaultAvatar || null,
        },
      }));

      return reply.send({
        rating: averageRating,
        reviewCount,
        distribution,
        reviews: mappedReviews,
      });
    } catch (error) {
      request.log.error(error, 'Erro ao listar avaliações');
      return reply.status(500).send({ error: 'Erro interno ao consultar avaliações.' });
    }
  },

  /**
   * Check if the authenticated tutor has completed appointments eligible for review.
   * Query: ?establishmentId=:id
   */
  async checkEligibility(request: FastifyRequest<{ Querystring: { establishmentId?: string; professionalId?: string } }>, reply: FastifyReply) {
    try {
      const user = request.user as any;
      if (!user || user.role !== Role.TUTOR) {
        return reply.send({ canReview: false, eligibleAppointments: [] });
      }

      const { establishmentId, professionalId } = request.query;
      const targetId = establishmentId || professionalId;

      if (!targetId) {
        return reply.status(400).send({ error: 'Parâmetro establishmentId ou professionalId é obrigatório.' });
      }

      // Find completed or paid appointments with this provider
      const appointments = await prisma.appointment.findMany({
        where: {
          tutorId: user.sub,
          OR: [
            { establishmentId: targetId },
            { professionalId: targetId },
          ],
          AND: [
            {
              OR: [
                { status: AppointmentStatus.COMPLETED },
                { paymentStatus: 'PAID' },
                { confirmedByTutor: true },
              ],
            },
          ],
        },
        include: {
          service: { select: { id: true, name: true } },
          pet: { select: { id: true, name: true, photo: true } },
          review: { select: { id: true } },
        },
        orderBy: { date: 'desc' },
      });

      const unreviewed = appointments.filter((apt) => !apt.review);

      return reply.send({
        canReview: unreviewed.length > 0,
        eligibleAppointments: appointments.map((apt) => ({
          id: apt.id,
          date: apt.date,
          serviceId: apt.serviceId,
          serviceName: apt.service?.name || 'Serviço',
          petName: apt.pet?.name || 'Pet',
          petPhoto: apt.pet?.photo || null,
          alreadyReviewed: Boolean(apt.review),
        })),
      });
    } catch (error) {
      request.log.error(error, 'Erro ao verificar elegibilidade de avaliação');
      return reply.status(500).send({ error: 'Erro ao verificar elegibilidade.' });
    }
  },

  /**
   * Create a new real review for an eligible appointment.
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      if (!user || user.role !== Role.TUTOR) {
        return reply.status(403).send({ error: 'Apenas tutores podem avaliar estabelecimentos e profissionais.' });
      }

      const body = createReviewSchema.parse(request.body);

      const appointment = await prisma.appointment.findUnique({
        where: { id: body.appointmentId },
        include: {
          review: true,
          service: true,
          establishment: true,
        },
      });

      if (!appointment) {
        return reply.status(404).send({ error: 'Agendamento não encontrado.' });
      }

      if (appointment.tutorId !== user.sub) {
        return reply.status(403).send({ error: 'Você só pode avaliar agendamentos vinculados ao seu usuário.' });
      }

      if (appointment.review) {
        return reply.status(409).send({ error: 'Este agendamento já foi avaliado anteriormente.' });
      }

      const isCompleted = appointment.status === AppointmentStatus.COMPLETED || appointment.paymentStatus === 'PAID' || appointment.confirmedByTutor;
      if (!isCompleted) {
        return reply.status(400).send({
          error: 'Apenas atendimentos concluídos ou confirmados podem ser avaliados.',
        });
      }

      // Validate sanitized petPhotoUrl if passed
      let sanitizedPhoto: string | null = null;
      if (body.petPhotoUrl) {
        const trimmed = body.petPhotoUrl.trim();
        if (trimmed.startsWith('/uploads/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          sanitizedPhoto = trimmed;
        }
      }

      const review = await prisma.review.create({
        data: {
          appointmentId: appointment.id,
          tutorId: user.sub,
          establishmentId: appointment.establishmentId,
          professionalId: appointment.professionalId || null,
          serviceId: appointment.serviceId,
          rating: body.rating,
          comment: body.comment,
          petPhotoUrl: sanitizedPhoto,
        },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              avatar: true,
              defaultAvatar: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Send notification to provider
      const targetUserId = appointment.establishmentId || appointment.professionalId;
      if (targetUserId) {
        createAndEmitNotification({
          userId: targetUserId,
          title: 'Nova avaliação recebida',
          message: `Seu serviço recebeu uma avaliação de ${body.rating} estrelas.`,
          type: 'APPOINTMENT',
        }).catch((notifErr) => {
          request.log.warn({ err: notifErr }, 'Falha ao emitir notificação de review');
        });
      }

      return reply.status(201).send({
        message: 'Avaliação publicada com sucesso!',
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          petPhotoUrl: review.petPhotoUrl,
          createdAt: review.createdAt,
          serviceName: review.service?.name || 'Serviço',
          tutor: {
            id: review.tutor.id,
            name: review.tutor.name,
            avatar: review.tutor.avatar || review.tutor.defaultAvatar || null,
          },
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: (error as any).issues?.[0]?.message || (error as any).errors?.[0]?.message || 'Dados inválidos.' });
      }
      request.log.error(error, 'Erro ao criar avaliação');
      return reply.status(500).send({ error: error.message || 'Erro interno ao publicar avaliação.' });
    }
  },
};
