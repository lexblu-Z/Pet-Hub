
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export async function addToCart(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const { productId, quantity } = request.body as { productId: string, quantity: number };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return reply.status(404).send({ error: 'Produto não encontrado.' });
  if (product.stock < quantity) return reply.status(400).send({ error: 'Estoque insuficiente.' });

  // Update or create cart item
  const existing = await prisma.cartItem.findFirst({
    where: { tutorId: user.sub, productId }
  });

  if (existing) {
    if (product.stock < existing.quantity + quantity) {
        return reply.status(400).send({ error: 'Estoque insuficiente para a quantidade adicionada.' });
    }
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        tutorId: user.sub,
        productId,
        quantity
      }
    });
  }

  return reply.send({ success: true, message: 'Produto adicionado ao carrinho' });
}
