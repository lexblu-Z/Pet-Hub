import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role, ApprovalStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const cleanEnv = (val?: string) => (val ? val.replace(/^["'\[]+|["'\]]+$/g, '').trim() : '');
const GOOGLE_CLIENT_ID = cleanEnv(process.env.GOOGLE_CLIENT_ID) || '';
const REDIRECT_URI = cleanEnv(process.env.GOOGLE_REDIRECT_URI) || 'http://localhost:3000/api/google/callback';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.TUTOR),
  description: z.string().optional(),
  address: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  document: z.string().optional(),
  // Establishment-specific fields
  businessName: z.string().optional(),
  establishmentType: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
});

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);

      // Strict validation for establishments: only Ourinhos - SP is accepted
      if (data.role === Role.ESTABLISHMENT) {
        if (data.city && data.city.trim().toLowerCase() !== 'ourinhos') {
          return reply.status(400).send({
            error: 'No momento, o PetHub está disponível apenas para estabelecimentos localizados em Ourinhos - SP.',
          });
        }
        if (data.state && data.state.trim().toUpperCase() !== 'SP') {
          return reply.status(400).send({
            error: 'No momento, o PetHub está disponível apenas para estabelecimentos localizados em Ourinhos - SP.',
          });
        }
      }

      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        return reply.status(409).send({ error: 'Este e-mail já está cadastrado.' });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            phone: data.phone,
            role: data.role,
          },
        });

        if (data.role === Role.ESTABLISHMENT) {
          await tx.establishmentProfile.create({
            data: {
              userId: user.id,
              description: data.description || null,
              address: data.address || null,
              document: data.document || null,
              businessName: data.businessName || data.name,
              type: data.establishmentType || null,
              city: data.city || 'Ourinhos',
              state: data.state || 'SP',
              zipCode: data.zipCode || null,
              phone: data.businessPhone || data.phone || null,
              email: data.businessEmail || data.email || null,
              photos: data.photos || [],
              status: ApprovalStatus.PENDING_APPROVAL,
            },
          });
        } else if (data.role === Role.PROFESSIONAL) {
          await tx.professionalProfile.create({
            data: {
              userId: user.id,
              specialty: data.specialty || null,
              bio: data.bio || null,
              document: data.document || null,
              status: ApprovalStatus.PENDING_APPROVAL,
            },
          });
        }

        return user;
      });

      // For ESTABLISHMENT and PROFESSIONAL, return pending status
      if (newUser.role === Role.ESTABLISHMENT || newUser.role === Role.PROFESSIONAL) {
        return reply.status(201).send({
          pendingApproval: true,
          message: 'Cadastro realizado com sucesso. Aguardando aprovação do administrador.',
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          },
        });
      }

      // For TUTOR, return JWT immediately
      const token = await reply.jwtSign({
        sub: newUser.id,
        role: newUser.role,
      });

      return reply.status(201).send({
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        return reply.status(400).send({ error: `Dados inválidos: ${fieldErrors}`, details: error.issues });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro interno no servidor.' });
    }
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
          establishmentProfile: true,
          professionalProfile: true,
        },
      });

      if (!user) {
        return reply.status(401).send({ error: 'E-mail ou senha incorretos.' });
      }

      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return reply.status(401).send({ error: 'E-mail ou senha incorretos.' });
      }

      // Check if establishment is rejected or suspended
      if (user.role === Role.ESTABLISHMENT && user.establishmentProfile) {
        if (user.establishmentProfile.status === ApprovalStatus.REJECTED) {
          return reply.status(403).send({
            error: 'O cadastro do seu estabelecimento foi rejeitado.',
            reason: user.establishmentProfile.rejectionReason || undefined,
          });
        }

        if (user.establishmentProfile.status === ApprovalStatus.SUSPENDED) {
          const now = new Date();
          const until = user.establishmentProfile.suspendedUntil ? new Date(user.establishmentProfile.suspendedUntil) : null;
          
          if (until && now >= until) {
            // Automatic reactivation: period expired
            user.establishmentProfile = await prisma.establishmentProfile.update({
              where: { id: user.establishmentProfile.id },
              data: {
                status: ApprovalStatus.ACTIVE,
                suspendedUntil: null,
                suspensionReason: null,
                suspendedAt: null,
              },
            });
          } else {
            const formattedDate = until ? until.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'data indeterminada';
            return reply.status(403).send({
              error: `Sua conta está temporariamente suspensa até ${formattedDate}.`,
              reason: user.establishmentProfile.suspensionReason || 'Violação das regras da plataforma.',
              suspendedUntil: user.establishmentProfile.suspendedUntil,
            });
          }
        }
      }

      // Check if professional is rejected or suspended
      if (user.role === Role.PROFESSIONAL && user.professionalProfile) {
        if (user.professionalProfile.status === ApprovalStatus.REJECTED) {
          return reply.status(403).send({
            error: 'Seu cadastro de profissional foi rejeitado.',
            reason: user.professionalProfile.rejectionReason || undefined,
          });
        }

        if (user.professionalProfile.status === ApprovalStatus.SUSPENDED) {
          const now = new Date();
          const until = user.professionalProfile.suspendedUntil ? new Date(user.professionalProfile.suspendedUntil) : null;
          
          if (until && now >= until) {
            // Automatic reactivation: period expired
            user.professionalProfile = await prisma.professionalProfile.update({
              where: { id: user.professionalProfile.id },
              data: {
                status: ApprovalStatus.ACTIVE,
                suspendedUntil: null,
                suspensionReason: null,
                suspendedAt: null,
              },
            });
          } else {
            const formattedDate = until ? until.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'data indeterminada';
            return reply.status(403).send({
              error: `Sua conta está temporariamente suspensa até ${formattedDate}.`,
              reason: user.professionalProfile.suspensionReason || 'Violação das regras da plataforma.',
              suspendedUntil: user.professionalProfile.suspendedUntil,
            });
          }
        }
      }

      // Allow login for PENDING_APPROVAL and ACTIVE
      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
      });

      const responseUser: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      };

      if (user.establishmentProfile) {
        responseUser.establishmentProfile = {
          status: user.establishmentProfile.status,
          businessName: user.establishmentProfile.businessName,
          type: user.establishmentProfile.type,
          city: user.establishmentProfile.city,
          state: user.establishmentProfile.state,
          photos: user.establishmentProfile.photos,
          suspendedUntil: user.establishmentProfile.suspendedUntil,
          suspensionReason: user.establishmentProfile.suspensionReason,
        };
      }
      if (user.professionalProfile) {
        responseUser.professionalProfile = {
          status: user.professionalProfile.status,
          specialty: user.professionalProfile.specialty,
          suspendedUntil: user.professionalProfile.suspendedUntil,
          suspensionReason: user.professionalProfile.suspensionReason,
        };
      }

      return reply.send({ token, user: responseUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        return reply.status(400).send({ error: `Dados inválidos: ${fieldErrors}` });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro interno no servidor.' });
    }
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.user as any;
      let user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          createdAt: true,
          preferences: true,
          establishmentProfile: true,
          professionalProfile: true,
        },
      });

      if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

      // Check automatic reactivation on me query
      if (user.establishmentProfile?.status === ApprovalStatus.SUSPENDED) {
        const now = new Date();
        const until = user.establishmentProfile.suspendedUntil ? new Date(user.establishmentProfile.suspendedUntil) : null;
        if (until && now >= until) {
          const reactivated = await prisma.establishmentProfile.update({
            where: { id: user.establishmentProfile.id },
            data: {
              status: ApprovalStatus.ACTIVE,
              suspendedUntil: null,
              suspensionReason: null,
              suspendedAt: null,
            },
          });
          user = { ...user, establishmentProfile: reactivated };
        }
      }

      if (user.professionalProfile?.status === ApprovalStatus.SUSPENDED) {
        const now = new Date();
        const until = user.professionalProfile.suspendedUntil ? new Date(user.professionalProfile.suspendedUntil) : null;
        if (until && now >= until) {
          const reactivated = await prisma.professionalProfile.update({
            where: { id: user.professionalProfile.id },
            data: {
              status: ApprovalStatus.ACTIVE,
              suspendedUntil: null,
              suspensionReason: null,
              suspendedAt: null,
            },
          });
          user = { ...user, professionalProfile: reactivated };
        }
      }

      return reply.send(user);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno no servidor.' });
    }
  },

  async getPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.user as any;
      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { preferences: true },
      });
      return reply.send(user?.preferences || {});
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao carregar preferências.' });
    }
  },

  async updatePreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.user as any;
      const data = request.body as any;

      const existing = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { preferences: true },
      });
      const currentPrefs = (existing?.preferences as any) || {};
      const merged = { ...currentPrefs, ...data };

      const user = await prisma.user.update({
        where: { id: token.sub },
        data: { preferences: merged },
        select: { preferences: true },
      });

      return reply.send(user.preferences);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao atualizar preferências.' });
    }
  },

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.user as any;
      const data = changePasswordSchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { id: token.sub } });
      if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

      const isValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValid) {
        return reply.status(400).send({ error: 'Senha atual incorreta.' });
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await prisma.user.update({
        where: { id: token.sub },
        data: { password: hashedPassword },
      });

      return reply.send({ message: 'Senha alterada com sucesso.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos.' });
      }
      return reply.status(500).send({ error: 'Erro interno no servidor.' });
    }
  },

  async getGoogleLoginUrl(request: FastifyRequest<{ Querystring: { returnTo?: string } }>, reply: FastifyReply) {
    const returnTo = request.query.returnTo || '/';
    const statePayload = {
      mode: 'login',
      returnTo,
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const activeClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID) || GOOGLE_CLIENT_ID;
    const activeRedirectUri = cleanEnv(process.env.GOOGLE_REDIRECT_URI) || REDIRECT_URI;

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(activeClientId)}&` +
      `redirect_uri=${encodeURIComponent(activeRedirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=select_account&` +
      `state=${encodeURIComponent(state)}`;

    return reply.send({ url: authUrl });
  },

  async completeGoogleRegistration(
    request: FastifyRequest<{ Body: { regToken: string; role: Role; phone?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { regToken, role, phone } = request.body || {};
      if (!regToken || !role) {
        return reply.status(400).send({ error: 'Token de registro e perfil são obrigatórios.' });
      }

      if (!([Role.TUTOR, Role.ESTABLISHMENT, Role.PROFESSIONAL] as Role[]).includes(role)) {
        return reply.status(400).send({ error: 'Perfil inválido selecionado.' });
      }

      let decoded: any;
      try {
        decoded = (request.server as any).jwt.verify(regToken);
      } catch {
        return reply.status(401).send({ error: 'Sessão de registro expirada. Faça login novamente.' });
      }

      if (!decoded.isGoogleRegistration || !decoded.googleEmail) {
        return reply.status(400).send({ error: 'Token de registro inválido.' });
      }

      const { googleEmail, googleName, googleAvatar } = decoded;

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: googleEmail },
        include: {
          establishmentProfile: true,
          professionalProfile: true,
        },
      });

      if (!user) {
        const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(), 10);

        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: googleName || 'Usuário PetHub',
              email: googleEmail,
              password: randomPassword,
              avatar: googleAvatar || null,
              phone: phone || null,
              role,
              establishmentProfile:
                role === Role.ESTABLISHMENT
                  ? {
                      create: {
                        businessName: googleName || 'Meu Estabelecimento',
                        status: ApprovalStatus.PENDING_APPROVAL,
                        city: 'Ourinhos',
                        state: 'SP',
                      },
                    }
                  : undefined,
              professionalProfile:
                role === Role.PROFESSIONAL
                  ? {
                      create: {
                        status: ApprovalStatus.PENDING_APPROVAL,
                      },
                    }
                  : undefined,
            },
            include: {
              establishmentProfile: true,
              professionalProfile: true,
            },
          });
          return newUser;
        });
      }

      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
      });

      return reply.send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          establishmentProfile: user.establishmentProfile,
          professionalProfile: user.professionalProfile,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao concluir cadastro com Google.' });
    }
  },
};
