
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { calculateCashback, normalizeCashbackCode } from '../utils/cashback';

const addressSchema = z.object({
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  zipCode: z.string().min(8, 'CEP é obrigatório'),
});

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive('Quantidade deve ser positiva'),
  })).min(1, 'O pedido precisa ter pelo menos um item'),
  deliveryMethod: z.enum(['DELIVERY', 'PICKUP']),
  deliveryAddress: addressSchema.optional().nullable(),
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória'),
  needsChange: z.boolean().optional().default(false),
  changeFor: z.number().positive().optional().nullable(),
  cashbackCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function listTutorOrders(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const orders = await prisma.order.findMany({
    where: { tutorId: user.sub },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
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
      }
    }
  });

  if (!order) return reply.status(404).send({ error: 'Pedido não encontrado.' });
  if (order.tutorId !== user.sub) return reply.status(403).send({ error: 'Acesso negado.' });

  return reply.send(order);
}

export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;

  // Validate body structure
  const parseResult = createOrderSchema.safeParse(request.body);
  if (!parseResult.success) {
    const errorMsg = (parseResult.error as any).issues?.map((e: any) => e.message).join(', ') || 'Dados do pedido inválidos.';
    return reply.status(400).send({ error: errorMsg });
  }

  const {
    items,
    deliveryMethod,
    deliveryAddress,
    paymentMethod,
    needsChange,
    changeFor,
    cashbackCode,
    notes,
  } = parseResult.data;

  // Validate address when delivery is chosen
  if (deliveryMethod === 'DELIVERY') {
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.number || !deliveryAddress.city) {
      return reply.status(400).send({ error: 'Endereço de entrega completo é obrigatório para entregas.' });
    }
  }

  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  let subtotalAmount = 0;
  const orderItemsData: any[] = [];
  const establishmentIds = new Set<string>();

  for (const item of items) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) {
      return reply.status(404).send({ error: `Produto com ID ${item.productId} não encontrado.` });
    }
    if (prod.stock < item.quantity) {
      return reply.status(400).send({ error: `Estoque insuficiente para "${prod.name}" (disponível: ${prod.stock}).` });
    }
    const itemSubtotal = prod.price * item.quantity;
    subtotalAmount += itemSubtotal;
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
      // 1. Process cashback voucher if provided
      let appliedVoucherId: string | null = null;
      let appliedVoucherCode: string | null = null;
      let cashbackDiscount = 0;

      if (cashbackCode) {
        const normalized = normalizeCashbackCode(cashbackCode);
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

      // Validate change if cash against final amount
      const isCash = paymentMethod.toLowerCase().includes('dinheiro') || paymentMethod.toUpperCase() === 'CASH';
      if (isCash && needsChange) {
        if (!changeFor || changeFor < finalAmount) {
          throw new Error(
            `O valor para troco (R$ ${changeFor?.toFixed(2) || 0}) deve ser maior ou igual ao total a pagar (R$ ${finalAmount.toFixed(2)}).`
          );
        }
      }

      // 2. Atomically verify and decrement stock for each item
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

      // 3. Create Order with items and applied cashback
      const newOrder = await tx.order.create({
        data: {
          tutorId: user.sub,
          totalAmount: finalAmount,
          subtotalAmount: subtotalAmount,
          discountAmount: cashbackDiscount,
          cashbackCodeApplied: appliedVoucherCode,
          cashbackDiscount: cashbackDiscount,
          cashbackCredited: false,
          status: OrderStatus.PENDING,
          paymentMethod,
          deliveryMethod,
          deliveryAddress: deliveryMethod === 'DELIVERY' ? (deliveryAddress as any) : null,
          needsChange: isCash ? !!needsChange : false,
          changeFor: isCash && needsChange ? changeFor : null,
          notes: notes?.trim() || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: true } },
          tutor: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      // 4. Mark cashback voucher as USED
      if (appliedVoucherId) {
        await tx.cashbackVoucher.update({
          where: { id: appliedVoucherId },
          data: {
            status: 'USED',
            usedAt: new Date(),
            orderId: newOrder.id,
          },
        });
      }

      // 5. Clean cart items for this tutor
      await tx.cartItem.deleteMany({
        where: { tutorId: user.sub, productId: { in: productIds } },
      });

      return newOrder;
    });


    // Create real notifications for establishments
    try {
      const orderShortId = order.id.slice(0, 8).toUpperCase();
      for (const estId of establishmentIds) {
        const estabItems = order.items.filter((it: any) => it.establishmentId === estId);
        const prodSummary = estabItems.map((it: any) => `${it.quantity}x ${it.product?.name || 'Item'}`).join(', ');
        const modeLabel = deliveryMethod === 'DELIVERY' ? 'Entrega' : 'Retirada';

        await prisma.notification.create({
          data: {
            userId: estId,
            title: `Novo pedido #${orderShortId} (${modeLabel})`,
            message: `${order.tutor.name} realizou uma compra: ${prodSummary}. Total: R$ ${totalAmount.toFixed(2)}. Forma: ${paymentMethod}.`,
            type: 'ORDER',
          },
        });
      }

      // Create notification for the tutor
      await prisma.notification.create({
        data: {
          userId: user.sub,
          title: `Pedido #${orderShortId} realizado`,
          message: `Seu pedido foi registrado com sucesso e está aguardando confirmação do estabelecimento parceiro.`,
          type: 'ORDER',
        },
      });
    } catch (notifErr) {
      request.log.error(notifErr, 'Erro ao criar notificações do pedido');
    }

    return reply.status(201).send(order);
  } catch (err: any) {
    request.log.error(err, 'Erro ao criar pedido');
    return reply.status(400).send({ error: err.message || 'Erro ao processar compra.' });
  }
}

export async function confirmReceipt(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const user = request.user as any;
  const { id } = request.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) return reply.status(404).send({ error: 'Pedido não encontrado.' });
  if (order.tutorId !== user.sub) return reply.status(403).send({ error: 'Acesso negado.' });

  // Idempotency check: if already completed or credited, return existing state gracefully
  if (order.cashbackCredited || order.status === OrderStatus.COMPLETED) {
    return reply.send({
      message: 'Pedido já concluído anteriormente.',
      order,
      cashbackCredited: true,
      cashbackAmount: order.cashbackAmountCredited || 0,
    });
  }

  if (order.status === OrderStatus.CANCELLED) {
    return reply.status(400).send({ error: 'Este pedido foi cancelado e não pode mais ser concluído.' });
  }

  const validStatuses: OrderStatus[] = [
    OrderStatus.SHIPPED,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.DELIVERED,
    OrderStatus.PAID,
    OrderStatus.CONFIRMED,
  ];

  if (!validStatuses.includes(order.status)) {
    return reply.status(400).send({
      error: `Não é possível confirmar recebimento de um pedido com status "${order.status}".`,
    });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.order.updateMany({
        where: {
          id,
          tutorId: user.sub,
          status: { in: validStatuses },
        },
        data: { status: OrderStatus.COMPLETED },
      });

      if (updateResult.count === 0) {
        const fresh = await tx.order.findUnique({ where: { id } });
        if (fresh?.status === OrderStatus.CANCELLED) {
          throw new Error('Este pedido foi cancelado e não pode mais ser concluído.');
        }
        if (fresh?.status === OrderStatus.COMPLETED) {
          throw new Error('Este pedido já foi concluído anteriormente.');
        }
        throw new Error('Não foi possível confirmar o recebimento devido a uma alteração de status simultânea.');
      }

      const freshOrder = await tx.order.findUniqueOrThrow({ where: { id } });

      // Idempotent Cashback Credit: 3% on eligible amount (excluding any cashback voucher discount!)
      let earnedCashback = 0;
      if (!freshOrder.cashbackCredited) {
        const eligibleAmount = Math.max(0, freshOrder.totalAmount);
        const cashbackResult = calculateCashback('PRODUCT', eligibleAmount);
        earnedCashback = cashbackResult.cashbackAmount;

        if (earnedCashback > 0) {
          const orderShortId = id.slice(0, 8).toUpperCase();
          await tx.cashbackTransaction.create({
            data: {
              userId: user.sub,
              amount: earnedCashback,
              type: 'EARNED',
              description: `Cashback Compra #${orderShortId} (3%)`,
              originType: 'ORDER',
              orderId: freshOrder.id,
              rate: 0.03,
              eligibleAmount,
              status: 'COMPLETED',
            },
          });
        }

        await tx.order.update({
          where: { id: freshOrder.id },
          data: {
            cashbackCredited: true,
            cashbackAmountCredited: earnedCashback,
          },
        });
      }

      return tx.order.findUniqueOrThrow({ where: { id } });
    });

    const orderShortId = id.slice(0, 8).toUpperCase();
    const establishmentId = order.items[0]?.establishmentId;
    if (establishmentId) {
      try {
        await prisma.notification.create({
          data: {
            userId: establishmentId,
            title: `Pedido #${orderShortId} Concluído!`,
            message: `O cliente confirmou o recebimento do pedido #${orderShortId}. Pedido concluído com sucesso.`,
            type: 'ORDER',
          },
        });
      } catch (notifErr) {
        request.log.error(notifErr, 'Erro ao notificar estabelecimento sobre confirmação do pedido');
      }
    }

    // Notify tutor about cashback earned if applicable
    if (updated.cashbackAmountCredited && updated.cashbackAmountCredited > 0) {
      try {
        await prisma.notification.create({
          data: {
            userId: user.sub,
            title: `Você recebeu R$ ${updated.cashbackAmountCredited.toFixed(2).replace('.', ',')} de cashback!`,
            message: `Seu recebimento do pedido #${orderShortId} foi confirmado. O saldo de cashback de 3% já está disponível na sua carteira.`,
            type: 'ORDER',
          },
        });
      } catch (notifErr) {
        request.log.error(notifErr, 'Erro ao notificar tutor sobre cashback');
      }
    }

    return reply.send({
      success: true,
      order: updated,
      cashbackCredited: updated.cashbackCredited,
      cashbackAmount: updated.cashbackAmountCredited || 0,
    });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Erro ao confirmar recebimento.' });
  }
}

export async function cancelTutorOrder(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const user = request.user as any;
  const { id } = request.params;

  const cancelSchema = z.object({
    reason: z.string().min(1, 'Motivo do cancelamento é obrigatório'),
    notes: z.string().optional().nullable(),
  });

  const { reason, notes } = cancelSchema.parse(request.body);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) return reply.status(404).send({ error: 'Pedido não encontrado.' });
  if (order.tutorId !== user.sub) return reply.status(403).send({ error: 'Acesso negado.' });

  if (order.status === OrderStatus.COMPLETED) {
    return reply.status(400).send({
      error: 'Este pedido já foi concluído e não pode mais ser cancelado.',
    });
  }

  if (order.status === OrderStatus.CANCELLED) {
    return reply.status(400).send({
      error: 'Este pedido já foi cancelado anteriormente.',
    });
  }

  // Only allow tutor cancellation if still PENDING or CONFIRMED or PAID
  const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PAID];
  if (!cancellableStatuses.includes(order.status)) {
    return reply.status(400).send({
      error: 'O pedido já está em preparação ou transporte e não pode mais ser cancelado pelo aplicativo. Entre em contato com o estabelecimento.',
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomic check and update
      const updateResult = await tx.order.updateMany({
        where: {
          id,
          tutorId: user.sub,
          status: { in: cancellableStatuses },
        },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: 'TUTOR',
          cancellationReason: reason,
          cancellationNotes: notes || null,
        },
      });

      if (updateResult.count === 0) {
        const fresh = await tx.order.findUnique({ where: { id } });
        if (fresh?.status === OrderStatus.COMPLETED) {
          throw new Error('Este pedido já foi concluído e não pode mais ser cancelado.');
        }
        if (fresh?.status === OrderStatus.CANCELLED) {
          throw new Error('Este pedido já foi cancelado anteriormente.');
        }
        throw new Error('O pedido já mudou de status e não pode mais ser cancelado pelo aplicativo.');
      }

      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });

      // 2. Restore stock for each item strictly inside transaction
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // 3. Reactivate cashback voucher if one was applied
      if (order.cashbackCodeApplied) {
        await tx.cashbackVoucher.updateMany({
          where: {
            code: order.cashbackCodeApplied,
            tutorId: user.sub,
            status: 'USED',
          },
          data: {
            status: 'ACTIVE',
            usedAt: null,
            orderId: null,
          },
        });
      }

      // 4. Create notification for establishment
      const orderShortId = id.slice(0, 8).toUpperCase();
      const establishmentId = order.items[0]?.establishmentId;
      if (establishmentId) {
        await tx.notification.create({
          data: {
            userId: establishmentId,
            title: `Pedido #${orderShortId} Cancelado pelo Cliente`,
            message: `O cliente cancelou o pedido #${orderShortId}. Motivo: ${reason}${notes ? ` (${notes})` : ''}. O estoque dos itens foi restaurado automaticamente.`,
            type: 'ORDER',
          },
        });
      }

      return updated;
    });

    return reply.send({ success: true, order: result });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Erro ao cancelar o pedido.' });
  }
}
