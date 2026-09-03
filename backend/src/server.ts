import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { authRoutes } from './routes/auth.routes';
import { petsRoutes } from './routes/pets.routes';
import { establishmentsRoutes } from './routes/establishments.routes';
import { servicesRoutes } from './routes/services.routes';
import { appointmentsRoutes } from './routes/appointments.routes';
import { adminRoutes } from './routes/admin.routes';
import { googleRoutes } from './routes/google.routes';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { uploadRoutes } from './routes/upload.routes';
import { ordersRoutes } from './routes/orders.routes';
import { cartRoutes } from './routes/cart.routes';
import { usersRoutes } from './routes/users.routes';
import { productsRoutes } from './routes/products.routes';
import { cashbackRoutes } from './routes/cashback.routes';
import { establishmentAreaRoutes } from './routes/establishmentArea.routes';
import { notificationsRoutes } from './routes/notifications.routes';

dotenv.config();

const fastify = Fastify({ logger: true });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Register plugins
// Allow empty JSON bodies without throwing FST_ERR_CTP_EMPTY_JSON_BODY
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
  if (!body || body.trim() === '') {
    done(null, {});
    return;
  }
  try {
    const json = JSON.parse(body);
    done(null, json);
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
});

fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

fastify.register(staticPlugin, {
  root: uploadsDir,
  prefix: '/uploads/',
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
fastify.register(adminRoutes, { prefix: '/api/admin' });
fastify.register(googleRoutes, { prefix: '/api/google' });
fastify.register(uploadRoutes, { prefix: '/api' });
fastify.register(ordersRoutes, { prefix: '/api' });
fastify.register(cartRoutes, { prefix: '/api' });
fastify.register(usersRoutes, { prefix: '/api/users' });
fastify.register(productsRoutes, { prefix: '/api' });
fastify.register(cashbackRoutes, { prefix: '/api' });
fastify.register(establishmentAreaRoutes, { prefix: '/api/establishment' });
fastify.register(notificationsRoutes, { prefix: '/api' });

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
