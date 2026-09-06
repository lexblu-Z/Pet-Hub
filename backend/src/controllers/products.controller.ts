import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('Preço deve ser maior que zero'),
  stock: z.number().int().nonnegative().default(0),
  photo: z.string().optional(),
});

export const productsController = {
  // Public listing of products from active establishments
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const products = await prisma.product.findMany({
        where: {
          stock: { gt: 0 },
          establishment: {
            establishmentProfile: {
              status: 'ACTIVE'
            }
          }
        },
        include: {
          establishment: {
            select: {
              id: true,
              name: true,
              avatar: true,
              defaultAvatar: true,
              phone: true,
              establishmentProfile: {
                select: {
                  businessName: true,
                  address: true,
                  city: true,
                  state: true,
                  zipCode: true,
                  phone: true,
                  photos: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(products);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar produtos' });
    }
  },

  // Get single product
  async get(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          establishment: {
            select: {
              id: true,
              name: true,
              avatar: true,
              defaultAvatar: true,
              phone: true,
              establishmentProfile: {
                select: {
                  businessName: true,
                  address: true,
                  city: true,
                  state: true,
                  zipCode: true,
                  phone: true,
                  photos: true,
                }
              }
            }
          }
        }
      });

      if (!product) return reply.status(404).send({ error: 'Produto não encontrado' });
      return reply.send(product);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar produto' });
    }
  },

  // Establishment creates product
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      if (user.role !== Role.ESTABLISHMENT && user.role !== Role.ADMIN) {
        return reply.status(403).send({ error: 'Apenas estabelecimentos podem cadastrar produtos' });
      }

      const data = productSchema.parse(request.body);
      const product = await prisma.product.create({
        data: {
          ...data,
          establishmentId: user.sub,
        }
      });

      return reply.status(201).send(product);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos' });
      }
      return reply.status(500).send({ error: 'Erro ao criar produto' });
    }
  },
};
