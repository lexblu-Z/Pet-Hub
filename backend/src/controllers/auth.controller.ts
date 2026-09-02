import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role, ApprovalStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.TUTOR),
  // Additional profile fields for Establishment / Professional
  description: z.string().optional(),
  address: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.nativeEnum(Role),
});

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        return reply.status(400).send({ error: 'Email já cadastrado.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user and profile transaction
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
              description: data.description,
              address: data.address,
              status: ApprovalStatus.PENDING_APPROVAL, // Starts as pending
            },
          });
        } else if (data.role === Role.PROFESSIONAL) {
          await tx.professionalProfile.create({
            data: {
              userId: user.id,
              specialty: data.specialty,
              bio: data.bio,
            },
          });
        }

        return user;
      });

      // Generate token
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
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro interno no servidor' });
    }
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
          establishmentProfile: true,
        },
      });

      if (!user) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' });
      }

      if (user.role !== data.role) {
        return reply.status(403).send({ error: 'Conta não pertence ao tipo de acesso selecionado.' });
      }

      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' });
      }

      // Check if establishment is active
      if (user.role === Role.ESTABLISHMENT) {
        if (user.establishmentProfile?.status === ApprovalStatus.PENDING_APPROVAL) {
          return reply.status(403).send({ error: 'Seu estabelecimento ainda está em análise pelo administrador.' });
        }
        if (user.establishmentProfile?.status === ApprovalStatus.REJECTED) {
          return reply.status(403).send({ error: 'O cadastro do seu estabelecimento foi rejeitado.' });
        }
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
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro interno no servidor' });
    }
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.user as any;
      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          establishmentProfile: true,
          professionalProfile: true,
        },
      });

      if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

      return reply.send(user);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno no servidor' });
    }
  }
};
