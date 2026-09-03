import { FastifyInstance } from 'fastify';
import { uploadAvatar, removeAvatar, uploadPetPhoto, uploadImage } from '../controllers/upload.controller';

export async function uploadRoutes(fastify: FastifyInstance) {
  // Public image upload (allows photo upload during registration and in-app)
  fastify.post('/upload/image', uploadImage);

  // Authenticated avatar & pet routes
  fastify.post('/upload/avatar', {
    onRequest: [async (request, reply) => {
      try { await request.jwtVerify(); } catch (err) { reply.send(err); }
    }],
  }, uploadAvatar);

  fastify.delete('/upload/avatar', {
    onRequest: [async (request, reply) => {
      try { await request.jwtVerify(); } catch (err) { reply.send(err); }
    }],
  }, removeAvatar);

  fastify.post('/upload/pet', {
    onRequest: [async (request, reply) => {
      try { await request.jwtVerify(); } catch (err) { reply.send(err); }
    }],
  }, uploadPetPhoto);
}
