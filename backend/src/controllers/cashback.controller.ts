import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { randomBytes } from 'crypto';

const redeemSchema = z.object({
  amount: z.number().positive('O valor deve ser maior que zero'),
});

export const cashbackController = {
  // Get user balance and history
  async getMyCashback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;

      const transactions = await prisma.cashbackTransaction.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate balance: EARNED - REDEEMED (only completed/used)
      let balance = 0;
      transactions.forEach(t => {
        if (t.type === 'EARNED') balance += t.amount;
        else if (t.type === 'REDEEMED') balance -= t.amount;
      });

      // Round to 2 decimals
      balance = Math.max(0, Math.round(balance * 100) / 100);

      return reply.send({
        balance,
        transactions,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar cashback' });
    }
  },

  // Redeem cashback and generate unique code
  async redeem(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = redeemSchema.parse(request.body);

      // Verify current balance
      const transactions = await prisma.cashbackTransaction.findMany({
        where: { userId: user.sub },
      });

      let currentBalance = 0;
      transactions.forEach(t => {
        if (t.type === 'EARNED') currentBalance += t.amount;
        else if (t.type === 'REDEEMED') currentBalance -= t.amount;
      });
      currentBalance = Math.round(currentBalance * 100) / 100;

      if (data.amount > currentBalance) {
        return reply.status(400).send({ error: `Saldo insuficiente. Seu saldo atual é R$ ${currentBalance.toFixed(2)}` });
      }

      // Generate unique single-use code e.g. CASH-7A9B-4C2E
      const randPart1 = randomBytes(2).toString('hex').toUpperCase();
      const randPart2 = randomBytes(2).toString('hex').toUpperCase();
      const code = `CASH-${randPart1}-${randPart2}`;

      const transaction = await prisma.cashbackTransaction.create({
        data: {
          userId: user.sub,
          amount: data.amount,
          type: 'REDEEMED',
          description: `Resgate de cashback - Código: ${code}`,
          code,
          status: 'COMPLETED',
        }
      });

      return reply.status(201).send({
        message: 'Resgate realizado com sucesso!',
        code,
        amount: data.amount,
        transaction,
        remainingBalance: currentBalance - data.amount,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos' });
      }
      return reply.status(500).send({ error: 'Erro ao realizar resgate' });
    }
  },
};
