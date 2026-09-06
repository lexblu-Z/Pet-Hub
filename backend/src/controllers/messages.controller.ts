import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const messagesController = {
  // GET /api/messages/conversations - List all conversations for the authenticated user
  async getConversations(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { sub: string };
    if (!user?.sub) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }

    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { participant1Id: user.sub },
            { participant2Id: user.sub },
          ],
        },
        include: {
          participant1: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              defaultAvatar: true,
              role: true,
              establishmentProfile: {
                select: {
                  businessName: true,
                  type: true,
                  photos: true,
                  phone: true,
                  address: true,
                  city: true,
                },
              },
              professionalProfile: {
                select: {
                  specialty: true,
                  workplacePhoto: true,
                  city: true,
                },
              },
            },
          },
          participant2: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              defaultAvatar: true,
              role: true,
              establishmentProfile: {
                select: {
                  businessName: true,
                  type: true,
                  photos: true,
                  phone: true,
                  address: true,
                  city: true,
                },
              },
              professionalProfile: {
                select: {
                  specialty: true,
                  workplacePhoto: true,
                  city: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              senderId: true,
              read: true,
              createdAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      // Map conversations and calculate unread messages
      const formatted = await Promise.all(
        conversations.map(async (c) => {
          const isP1 = c.participant1Id === user.sub;
          const otherUser = isP1 ? c.participant2 : c.participant1;

          const unreadCount = await prisma.message.count({
            where: {
              conversationId: c.id,
              senderId: { not: user.sub },
              read: false,
            },
          });

          const businessName =
            otherUser.establishmentProfile?.businessName ||
            (otherUser.role === 'PROFESSIONAL' ? otherUser.name : otherUser.name);

          const displayAvatar =
            otherUser.avatar ||
            otherUser.establishmentProfile?.photos?.[0] ||
            otherUser.professionalProfile?.workplacePhoto ||
            otherUser.defaultAvatar;

          return {
            id: c.id,
            participant1Id: c.participant1Id,
            participant2Id: c.participant2Id,
            lastMessageAt: c.lastMessageAt,
            createdAt: c.createdAt,
            unreadCount,
            lastMessage: c.messages[0] || null,
            otherUser: {
              id: otherUser.id,
              name: otherUser.name,
              businessName,
              email: otherUser.email,
              phone: otherUser.phone || otherUser.establishmentProfile?.phone,
              avatar: displayAvatar,
              role: otherUser.role,
              establishmentProfile: otherUser.establishmentProfile,
              professionalProfile: otherUser.professionalProfile,
            },
          };
        })
      );

      return reply.send(formatted);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao listar conversas.' });
    }
  },

  // GET /api/messages/conversations/:id - Get conversation details and all messages
  async getConversation(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const user = request.user as { sub: string };
    if (!user?.sub) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }

    const { id } = request.params;

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          participant1: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              defaultAvatar: true,
              role: true,
              establishmentProfile: {
                select: {
                  businessName: true,
                  type: true,
                  photos: true,
                  phone: true,
                  address: true,
                  city: true,
                },
              },
              professionalProfile: {
                select: {
                  specialty: true,
                  workplacePhoto: true,
                  city: true,
                },
              },
            },
          },
          participant2: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              defaultAvatar: true,
              role: true,
              establishmentProfile: {
                select: {
                  businessName: true,
                  type: true,
                  photos: true,
                  phone: true,
                  address: true,
                  city: true,
                },
              },
              professionalProfile: {
                select: {
                  specialty: true,
                  workplacePhoto: true,
                  city: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              conversationId: true,
              senderId: true,
              content: true,
              read: true,
              createdAt: true,
            },
          },
        },
      });

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversa não encontrada.' });
      }

      // Security check: Only participants can access
      if (
        conversation.participant1Id !== user.sub &&
        conversation.participant2Id !== user.sub
      ) {
        return reply.status(403).send({ error: 'Você não tem permissão para acessar esta conversa.' });
      }

      // Mark unread messages sent by the other user as read
      await prisma.message.updateMany({
        where: {
          conversationId: conversation.id,
          senderId: { not: user.sub },
          read: false,
        },
        data: { read: true },
      });

      const isP1 = conversation.participant1Id === user.sub;
      const otherUser = isP1 ? conversation.participant2 : conversation.participant1;

      const businessName =
        otherUser.establishmentProfile?.businessName ||
        (otherUser.role === 'PROFESSIONAL' ? otherUser.name : otherUser.name);

      const displayAvatar =
        otherUser.avatar ||
        otherUser.establishmentProfile?.photos?.[0] ||
        otherUser.professionalProfile?.workplacePhoto ||
        otherUser.defaultAvatar;

      return reply.send({
        id: conversation.id,
        participant1Id: conversation.participant1Id,
        participant2Id: conversation.participant2Id,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          businessName,
          email: otherUser.email,
          phone: otherUser.phone || otherUser.establishmentProfile?.phone,
          avatar: displayAvatar,
          role: otherUser.role,
          establishmentProfile: otherUser.establishmentProfile,
          professionalProfile: otherUser.professionalProfile,
        },
        messages: conversation.messages,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao carregar conversa.' });
    }
  },

  // POST /api/messages - Send a message (creates conversation if recipientId is supplied)
  async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { sub: string };
    if (!user?.sub) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }

    const schema = z.object({
      conversationId: z.string().optional(),
      recipientId: z.string().optional(),
      content: z.string().min(1, 'A mensagem não pode ser vazia.').max(4000, 'A mensagem é muito longa.'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { conversationId, recipientId, content } = parsed.data;

    if (!conversationId && !recipientId) {
      return reply.status(400).send({ error: 'Informe conversationId ou recipientId.' });
    }

    try {
      let targetConversationId = conversationId;
      let targetRecipientId = recipientId;

      if (!targetConversationId && recipientId) {
        if (recipientId === user.sub) {
          return reply.status(400).send({ error: 'Você não pode enviar mensagens para si mesmo.' });
        }

        const recipientExists = await prisma.user.findUnique({
          where: { id: recipientId },
          select: { id: true },
        });

        if (!recipientExists) {
          return reply.status(404).send({ error: 'Destinatário não encontrado.' });
        }

        // Canonical ordering of participants to guarantee uniqueness
        const [p1, p2] = user.sub < recipientId ? [user.sub, recipientId] : [recipientId, user.sub];

        let conversation = await prisma.conversation.findUnique({
          where: {
            participant1Id_participant2Id: {
              participant1Id: p1,
              participant2Id: p2,
            },
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              participant1Id: p1,
              participant2Id: p2,
            },
          });
        }

        targetConversationId = conversation.id;
        targetRecipientId = recipientId;
      } else if (targetConversationId) {
        const conversation = await prisma.conversation.findUnique({
          where: { id: targetConversationId },
        });

        if (!conversation) {
          return reply.status(404).send({ error: 'Conversa não encontrada.' });
        }

        if (
          conversation.participant1Id !== user.sub &&
          conversation.participant2Id !== user.sub
        ) {
          return reply.status(403).send({ error: 'Você não tem permissão para enviar mensagens nesta conversa.' });
        }

        targetRecipientId =
          conversation.participant1Id === user.sub
            ? conversation.participant2Id
            : conversation.participant1Id;
      }

      if (!targetConversationId) {
        return reply.status(400).send({ error: 'Não foi possível determinar a conversa.' });
      }

      // Create message in database
      const message = await prisma.message.create({
        data: {
          conversationId: targetConversationId,
          senderId: user.sub,
          content: content.trim(),
          read: false,
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          read: true,
          createdAt: true,
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: targetConversationId },
        data: { lastMessageAt: new Date() },
      });

      // Create in-app notification for the recipient
      if (targetRecipientId) {
        try {
          const sender = await prisma.user.findUnique({
            where: { id: user.sub },
            select: {
              name: true,
              establishmentProfile: { select: { businessName: true } },
            },
          });
          const senderName =
            sender?.establishmentProfile?.businessName || sender?.name || 'Novo contato';

          await prisma.notification.create({
            data: {
              userId: targetRecipientId,
              title: `Nova mensagem de ${senderName}`,
              message:
                content.trim().length > 80
                  ? `${content.trim().slice(0, 77)}...`
                  : content.trim(),
              type: 'MESSAGE',
            },
          });
        } catch (notifErr) {
          request.log.warn({ err: notifErr }, 'Could not create notification for message');
        }
      }

      return reply.status(201).send({
        success: true,
        conversationId: targetConversationId,
        message,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao enviar mensagem.' });
    }
  },

  // GET /api/messages/unread-count - Get total unread count for badge
  async getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { sub: string };
    if (!user?.sub) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }

    try {
      const count = await prisma.message.count({
        where: {
          read: false,
          senderId: { not: user.sub },
          conversation: {
            OR: [
              { participant1Id: user.sub },
              { participant2Id: user.sub },
            ],
          },
        },
      });

      return reply.send({ unreadCount: count });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao obter contador de mensagens não lidas.' });
    }
  },

  // GET /api/messages/contacts - Contacts list to start new conversation
  async getContacts(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { sub: string };
    if (!user?.sub) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }

    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.sub },
        select: { role: true },
      });

      if (!currentUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      if (currentUser.role === 'TUTOR') {
        // Tutors can contact active establishments and professionals
        const establishments = await prisma.user.findMany({
          where: {
            role: { in: ['ESTABLISHMENT', 'PROFESSIONAL'] },
            id: { not: user.sub },
            OR: [
              { establishmentProfile: { status: 'ACTIVE' } },
              { professionalProfile: { status: 'ACTIVE' } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            defaultAvatar: true,
            role: true,
            establishmentProfile: {
              select: {
                businessName: true,
                type: true,
                photos: true,
                phone: true,
                address: true,
                city: true,
              },
            },
            professionalProfile: {
              select: {
                specialty: true,
                workplacePhoto: true,
                city: true,
              },
            },
          },
        });

        const formatted = establishments.map((e) => {
          const businessName =
            e.establishmentProfile?.businessName ||
            (e.role === 'PROFESSIONAL' ? e.name : e.name);
          const avatar =
            e.avatar ||
            e.establishmentProfile?.photos?.[0] ||
            e.professionalProfile?.workplacePhoto ||
            e.defaultAvatar;
          return {
            id: e.id,
            name: e.name,
            businessName,
            role: e.role,
            type: e.establishmentProfile?.type || e.professionalProfile?.specialty || (e.role === 'PROFESSIONAL' ? 'Veterinário(a)' : 'Pet Shop & Clínica'),
            avatar,
            phone: e.phone || e.establishmentProfile?.phone,
            address: e.establishmentProfile?.address || '',
            city: e.establishmentProfile?.city || e.professionalProfile?.city || '',
          };
        });

        return reply.send(formatted);
      } else {
        // Establishment or Professional: contact tutors who booked appointments or placed orders, or any tutors
        const tutorsWithAppointments = await prisma.appointment.findMany({
          where: {
            OR: [
              { establishmentId: user.sub },
              { professionalId: user.sub },
            ],
          },
          select: { tutorId: true },
          distinct: ['tutorId'],
        });

        const tutorsWithOrders = await prisma.orderItem.findMany({
          where: { establishmentId: user.sub },
          select: { order: { select: { tutorId: true } } },
          distinct: ['orderId'],
        });

        const tutorIdSet = new Set<string>();
        tutorsWithAppointments.forEach((a) => tutorIdSet.add(a.tutorId));
        tutorsWithOrders.forEach((o) => {
          if (o.order?.tutorId) tutorIdSet.add(o.order.tutorId);
        });

        // Also include any tutor that has an existing conversation
        const existingConversations = await prisma.conversation.findMany({
          where: {
            OR: [
              { participant1Id: user.sub },
              { participant2Id: user.sub },
            ],
          },
          select: { participant1Id: true, participant2Id: true },
        });

        existingConversations.forEach((c) => {
          const otherId = c.participant1Id === user.sub ? c.participant2Id : c.participant1Id;
          tutorIdSet.add(otherId);
        });

        let tutors = await prisma.user.findMany({
          where: {
            id: { in: Array.from(tutorIdSet), not: user.sub },
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            defaultAvatar: true,
            role: true,
          },
        });

        // If no clients yet, allow contacting any registered tutors for support
        if (tutors.length === 0) {
          tutors = await prisma.user.findMany({
            where: { role: 'TUTOR', id: { not: user.sub } },
            take: 20,
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              defaultAvatar: true,
              role: true,
            },
          });
        }

        const formatted = tutors.map((t) => ({
          id: t.id,
          name: t.name,
          businessName: t.name,
          role: t.role,
          type: 'Tutor',
          avatar: t.avatar || t.defaultAvatar,
          phone: t.phone,
          address: '',
          city: '',
        }));

        return reply.send(formatted);
      }
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao buscar contatos.' });
    }
  },
};
