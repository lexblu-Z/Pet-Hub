import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { messagesController } from '../controllers/messages.controller';

export const messagesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Ensure all message routes are authenticated with JWT
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado. Faça login para continuar.' });
    }
  });

  // Message endpoints
  fastify.get('/conversations', messagesController.getConversations);
  fastify.post('/conversations', messagesController.createConversation);
  fastify.get('/conversations/:id', messagesController.getConversation);
  fastify.post('/', messagesController.sendMessage);
  fastify.get('/unread-count', messagesController.getUnreadCount);
  fastify.get('/contacts', messagesController.getContacts);
};
