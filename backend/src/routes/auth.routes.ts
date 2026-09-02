import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authController } from '../controllers/auth.controller';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);

  // Authenticated route
  fastify.get(
    '/me',
    {
      onRequest: [async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.send(err);
        }
      }],
    },
    authController.me
  );
};
