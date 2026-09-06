
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export async function listTutorOrders(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const orders = await prisma.order.findMany({
    where: { tutorId: user.sub },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
          establishment: { select: { name: true } }
        }
      }
    }
  });
  return reply.send(orders);
}

export async function getOrderById(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const { id } = request.params as { id: string };

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
          establishment: { select: { name: true } }
        }
      }
    }
  });

  if (!order) return reply.status(404).send({ error: 'Pedido não encontrado.' });
  if (order.tutorId !== user.sub) return reply.status(403).send({ error: 'Acesso negado.' });

  return reply.send(order);
}

export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const { items, paymentMethod } = request.body as {
    items: { productId: string; quantity: number }[];
    paymentMethod?: string;
  };

  if (!items || items.length === 0) {
    return reply.status(400).send({ error: 'Nenhum item no pedido.' });
  }

  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  let totalAmount = 0;
  const orderItemsData: any[] = [];
  const establishmentIds = new Set<string>();

  for (const item of items) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return reply.status(404).send({ error: 'Produto não encontrado.' });
    if (prod.stock < item.quantity) {
      return reply.status(400).send({ error: `Estoque insuficiente para ${prod.name}.` });
    }
    const itemSubtotal = prod.price * item.quantity;
    totalAmount += itemSubtotal;
    establishmentIds.add(prod.establishmentId);

    orderItemsData.push({
      productId: prod.id,
      quantity: item.quantity,
      priceAtTime: prod.price,
      establishmentId: prod.establishmentId,
    });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. Verify and atomically decrement stock for each item
      for (const item of items) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          const current = await tx.product.findUnique({ where: { id: item.productId } });
          throw new Error(`Estoque insuficiente ou esgotado para "${current?.name || 'o produto'}".`);
        }
      }

      // 2. Create Order with items
      const newOrder = await tx.order.create({
        data: {
          tutorId: user.sub,
          totalAmount,
          status: 'PAID',
          paymentMethod: paymentMethod || 'Cartão de Crédito',
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      // 3. Clean cart items
      await tx.cartItem.deleteMany({
        where: { tutorId: user.sub, productId: { in: productIds } },
      });

      return newOrder;
    });

    // Create real notifications for establishments
    try {
      for (const estId of establishmentIds) {
        const estabItems = order.items.filter((it: any) => it.establishmentId === estId);
        const prodSummary = estabItems.map((it: any) => `${it.quantity}x ${it.product?.name || 'Item'}`).join(', ');
        await prisma.notification.create({
          data: {
            userId: estId,
            title: 'Novo pedido recebido',
            message: `Você recebeu um novo pedido (#${order.id.slice(0, 8).toUpperCase()}) contendo: ${prodSummary}.`,
            type: 'ORDER',
          },
        });
      }
    } catch (notifErr) {
      request.log.error(notifErr);
    }

    return reply.status(201).send(order);
  } catch (err: any) {
    request.log.error(err, 'Erro ao criar pedido');
    return reply.status(400).send({ error: err.message || 'Erro ao processar compra.' });
  }
}
