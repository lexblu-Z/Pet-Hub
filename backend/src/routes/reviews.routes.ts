import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { reviewsController } from '../controllers/reviews.controller';

export const reviewsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Public listing of reviews and calculated metrics
  fastify.get('/', reviewsController.list);

  // Authenticated routes for tutors
  fastify.register(async (authGroup) => {
    authGroup.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    authGroup.get('/eligibility', reviewsController.checkEligibility);
    authGroup.post('/', reviewsController.create);
  });
};
