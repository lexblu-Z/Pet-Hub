import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { adminController } from '../controllers/admin.controller';
import { Role } from '@prisma/client';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = request.user as any;
      if (user.role !== Role.ADMIN) {
        return reply.status(403).send({ error: 'Acesso negado. Apenas administradores.' });
      }
    } catch (err) {
      return reply.send(err);
    }
  });

  fastify.get('/dashboard', adminController.getDashboard);
  fastify.get('/users', adminController.listUsers);
  
  fastify.get('/establishments', adminController.listEstablishments);
  fastify.put('/establishments/:id/status', adminController.updateEstablishmentStatus);
  fastify.post('/establishments/:id/approve', async (req, rep) => {
    req.body = { status: 'ACTIVE' };
    return adminController.updateEstablishmentStatus(req as any, rep);
  });
  fastify.post('/establishments/:id/reject', async (req, rep) => {
    // Expected body: { rejectionReason: '...' }
    const { rejectionReason } = req.body as any;
    req.body = { status: 'REJECTED', rejectionReason };
    return adminController.updateEstablishmentStatus(req as any, rep);
  });

  fastify.get('/professionals', adminController.listProfessionals);
  fastify.put('/professionals/:id/status', adminController.updateProfessionalStatus);
  fastify.post('/professionals/:id/approve', async (req, rep) => {
    req.body = { status: 'ACTIVE' };
    return adminController.updateProfessionalStatus(req as any, rep);
  });
  fastify.post('/professionals/:id/reject', async (req, rep) => {
    const { rejectionReason } = req.body as any;
    req.body = { status: 'REJECTED', rejectionReason };
    return adminController.updateProfessionalStatus(req as any, rep);
  });

  fastify.post('/admins', adminController.createAdmin);
};
