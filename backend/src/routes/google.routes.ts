import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { googleController } from '../controllers/google.controller';

export const googleRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Public callback from Google OAuth redirect
  fastify.get('/callback', googleController.callback);

  // Authenticated routes
  fastify.register(async (authGroup) => {
    authGroup.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    authGroup.get('/auth-url', googleController.getAuthUrl);
    authGroup.get('/status', googleController.getStatus);
    authGroup.get('/calendars', googleController.getCalendars);
    authGroup.post('/select-calendar', googleController.selectCalendar);
    authGroup.post('/create-pethub-calendar', googleController.createPetHubCalendar);
    authGroup.post('/sync-now', googleController.syncNow);
    authGroup.get('/logs', googleController.getLogs);
    authGroup.get('/events', googleController.getEvents);
    authGroup.post('/disconnect', googleController.disconnect);
  });
};
