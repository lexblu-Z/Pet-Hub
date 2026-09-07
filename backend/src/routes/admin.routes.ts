import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { adminController } from '../controllers/admin.controller';
import { adminReportsController } from '../controllers/adminReports.controller';
import { adminFinanceController } from '../controllers/adminFinance.controller';
import { adminAppointmentsController } from '../controllers/adminAppointments.controller';
import { adminPetsController } from '../controllers/adminPets.controller';
import { adminNotificationsController } from '../controllers/adminNotifications.controller';
import { adminAuditController } from '../controllers/adminAudit.controller';
import { adminExportController } from '../controllers/adminExport.controller';
import { Role } from '@prisma/client';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = request.user as any;
      if (user?.role !== Role.ADMIN) {
        return reply.status(403).send({ error: 'Acesso negado. Apenas administradores.' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Não autenticado.' });
    }
  });

  // Operational Dashboard
  fastify.get('/dashboard', adminController.getDashboard);
  fastify.get('/dashboard/alerts', adminController.getAlerts);
  fastify.get('/dashboard/performance', adminController.getPerformanceChart);

  // Users Management
  fastify.get('/users', adminController.listUsers);
  fastify.delete('/users/:id', adminController.deleteUser);
  
  // Establishments Management
  fastify.get('/establishments', adminController.listEstablishments);
  fastify.put('/establishments/:id/status', adminController.updateEstablishmentStatus);
  fastify.post('/establishments/:id/approve', async (req, rep) => {
    req.body = { status: 'ACTIVE' };
    return adminController.updateEstablishmentStatus(req as any, rep);
  });
  fastify.post('/establishments/:id/reject', async (req, rep) => {
    const { rejectionReason } = req.body as any;
    req.body = { status: 'REJECTED', rejectionReason };
    return adminController.updateEstablishmentStatus(req as any, rep);
  });

  // Professionals Management
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

  // Pets Management
  fastify.get('/pets', adminPetsController.listPets);
  fastify.get('/pets/:id', adminPetsController.getPetDetails);

  // Moderation & Complaints
  fastify.get('/reports', adminReportsController.listReports);
  fastify.get('/reports/:id', adminReportsController.getReportDetails);
  fastify.put('/reports/:id/status', adminReportsController.updateReportStatus);

  // Universal Appointments
  fastify.get('/appointments/universal', adminAppointmentsController.listUniversal);
  fastify.get('/appointments/search', adminAppointmentsController.searchByCode);

  // Financial Center
  fastify.get('/finance/overview', adminFinanceController.getOverview);

  // Notifications Broadcast
  fastify.post('/notifications/broadcast', adminNotificationsController.broadcast);
  fastify.get('/notifications/history', adminNotificationsController.listBroadcastHistory);

  // Audit Logs
  fastify.get('/audit-logs', adminAuditController.listLogs);

  // Official Exports (PDF / CSV)
  fastify.get('/export', adminExportController.exportReport);

  // Admin Management
  fastify.post('/admins', adminController.createAdmin);
};
