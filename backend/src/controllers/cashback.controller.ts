import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateSecureCashbackCode, normalizeCashbackCode } from '../utils/cashback';

const redeemSchema = z.object({
  amount: z.number().positive('O valor deve ser maior que zero'),
});

const validateCodeSchema = z.object({
  code: z.string().min(1, 'Código de cashback é obrigatório'),
});

export const cashbackController = {
  /**
   * Get user cashback balance, total earned, total redeemed, full ledger and active vouchers.
   */
  async getMyCashback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;

      const transactions = await prisma.cashbackTransaction.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
      });

      let totalEarned = 0;
      let totalRedeemed = 0;

      transactions.forEach((t) => {
        if (t.type === 'EARNED') totalEarned += t.amount;
        else if (t.type === 'REDEEMED') totalRedeemed += t.amount;
      });

      totalEarned = Math.round(totalEarned * 100) / 100;
      totalRedeemed = Math.round(totalRedeemed * 100) / 100;
      const balance = Math.max(0, Math.round((totalEarned - totalRedeemed) * 100) / 100);

      const activeVouchers = await prisma.cashbackVoucher.findMany({
        where: {
          tutorId: user.sub,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        balance,
        totalEarned,
        totalRedeemed,
        transactions,
        activeVouchers,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar dados do cashback.' });
    }
  },

  /**
   * Redeem cashback balance and generate a cryptographically secure, high-entropy unique voucher.
   * Strictly protected against race conditions via pessimistic row locking (SELECT ... FOR UPDATE).
   */
  async redeem(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = redeemSchema.parse(request.body);
      const redeemAmount = Math.round(data.amount * 100) / 100;

      if (redeemAmount <= 0) {
        return reply.status(400).send({ error: 'O valor de resgate deve ser maior que zero.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Pessimistic Lock on User row to serialize concurrent redemptions
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.sub} FOR UPDATE;`;

        // Calculate real balance from ledger
        const userTxs = await tx.cashbackTransaction.findMany({
          where: { userId: user.sub },
        });

        let earned = 0;
        let redeemed = 0;
        userTxs.forEach((t) => {
          if (t.type === 'EARNED') earned += t.amount;
          else if (t.type === 'REDEEMED') redeemed += t.amount;
        });

        const currentBalance = Math.max(0, Math.round((earned - redeemed) * 100) / 100);

        if (redeemAmount > currentBalance) {
          throw new Error(
            `Saldo insuficiente. Seu saldo atual é R$ ${currentBalance.toFixed(2).replace('.', ',')}.`
          );
        }

        // Generate unique high-entropy code
        let code = generateSecureCashbackCode();
        let attempts = 0;
        while (attempts < 5) {
          const exists = await tx.cashbackVoucher.findUnique({ where: { code } });
          if (!exists) break;
          code = generateSecureCashbackCode();
          attempts++;
        }

        // 1. Create REDEEMED ledger transaction
        const transaction = await tx.cashbackTransaction.create({
          data: {
            userId: user.sub,
            amount: redeemAmount,
            type: 'REDEEMED',
            description: `Resgate de cashback - Voucher: ${code}`,
            code,
            originType: 'REDEMPTION',
            status: 'COMPLETED',
          },
        });

        // 2. Create CashbackVoucher model
        const voucher = await tx.cashbackVoucher.create({
          data: {
            code,
            tutorId: user.sub,
            amount: redeemAmount,
            status: 'ACTIVE',
          },
        });

        const remainingBalance = Math.round((currentBalance - redeemAmount) * 100) / 100;

        return {
          code,
          amount: redeemAmount,
          transaction,
          voucher,
          remainingBalance,
        };
      });

      return reply.status(201).send({
        message: 'Resgate realizado com sucesso!',
        code: result.code,
        amount: result.amount,
        remainingBalance: result.remainingBalance,
        voucher: result.voucher,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Dados inválidos.' });
      }
      return reply.status(400).send({ error: error.message || 'Erro ao realizar resgate.' });
    }
  },

  /**
   * Validate a cashback code for checkout application.
   * Checks existence, ownership, active status and remaining discount value.
   */
  async validateCode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = validateCodeSchema.parse(request.body);
      const normalized = normalizeCashbackCode(data.code);

      const voucher = await prisma.cashbackVoucher.findUnique({
        where: { code: normalized },
      });

      if (!voucher) {
        return reply.status(400).send({ error: 'Código de cashback inválido ou inexistente.' });
      }

      if (voucher.tutorId !== user.sub) {
        return reply.status(400).send({ error: 'Este código de cashback não pertence a esta conta.' });
      }

      if (voucher.status === 'USED') {
        return reply.status(400).send({ error: 'Este código de cashback já foi utilizado.' });
      }

      if (voucher.status === 'CANCELLED') {
        return reply.status(400).send({ error: 'Este código de cashback foi cancelado.' });
      }

      if (voucher.status !== 'ACTIVE') {
        return reply.status(400).send({ error: 'Este código de cashback não está disponível.' });
      }

      return reply.send({
        valid: true,
        code: voucher.code,
        amount: voucher.amount,
        createdAt: voucher.createdAt,
        voucher,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues[0]?.message || 'Código inválido.' });
      }
      return reply.status(500).send({ error: 'Erro ao validar código de cashback.' });
    }
  },
};
