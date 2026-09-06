import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authController } from '../controllers/auth.controller';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);
  fastify.get('/google/url', authController.getGoogleLoginUrl);
  fastify.post('/google/complete', authController.completeGoogleRegistration);
  fastify.post('/otp/send', authController.sendOtp);
  fastify.post('/otp/verify', authController.verifyOtp);
  fastify.post('/otp/complete', authController.completeOtpRegistration);
  fastify.post('/forgot-password', authController.forgotPassword);
  fastify.post('/reset-password', authController.resetPassword);

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
