import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';

import { authRoutes } from './routes/auth.routes';
import { petsRoutes } from './routes/pets.routes';
import { establishmentsRoutes } from './routes/establishments.routes';
import { servicesRoutes } from './routes/services.routes';
import { appointmentsRoutes } from './routes/appointments.routes';
import { googleRoutes } from './routes/google.routes';

dotenv.config();

const fastify = Fastify({ logger: true });


// Register plugins
fastify.register(cors, {
  origin: '*', // For development. In prod, specify the frontend domain.
});

fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'super-secret-fallback',
});

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(petsRoutes, { prefix: '/api/pets' });
fastify.register(establishmentsRoutes, { prefix: '/api/establishments' });
fastify.register(servicesRoutes, { prefix: '/api/services' });
fastify.register(appointmentsRoutes, { prefix: '/api/appointments' });
fastify.register(googleRoutes, { prefix: '/api/google' });

// Basic route
fastify.get('/', async (request, reply) => {
  return { status: 'PetHub Backend API is running! 🐾' };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
