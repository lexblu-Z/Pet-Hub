import { FastifyReply, FastifyRequest } from 'fastify';
import { partnerProgramService } from '../services/partner-program.service.js';

export const partnerProgramController = {
  async getParticipation(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const data = await partnerProgramService.getParticipation(user.sub);
    return reply.send(data);
  },

  async optIn(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    try {
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];
      const participation = await partnerProgramService.optIn(user.sub, ipAddress, userAgent);
      return reply.send({
        message: 'Adesão ao Programa de Parceiros realizada com sucesso!',
        participation,
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message || 'Erro ao aderir ao programa.' });
    }
  },

  async optOut(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    try {
      const participation = await partnerProgramService.optOut(user.sub);
      return reply.send({
        message: 'Participação no Programa de Parceiros recusada ou desativada com sucesso.',
        participation,
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message || 'Erro ao desativar participação.' });
    }
  },

  async getPayouts(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const data = await partnerProgramService.getPayouts(user.sub);
    return reply.send(data);
  },

  async getAdminOverview(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito ao administrador.' });
    }
    const data = await partnerProgramService.getAdminOverview();
    return reply.send(data);
  },

  async updatePayoutStatus(request: FastifyRequest<{ Params: { id: string }; Body: { status: 'APPROVED' | 'PAID' | 'CANCELLED' } }>, reply: FastifyReply) {
    const user = request.user as any;
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito ao administrador.' });
    }
    const { id } = request.params;
    const { status } = request.body;
    try {
      const updated = await partnerProgramService.updatePayoutStatus(id, status);
      return reply.send({ message: 'Status do repasse atualizado.', payout: updated });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message || 'Erro ao atualizar repasse.' });
    }
  },
};
