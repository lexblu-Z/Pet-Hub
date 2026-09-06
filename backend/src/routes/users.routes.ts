import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authController } from '../controllers/auth.controller';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

export const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify(); } catch (err) { reply.send(err); }
  });

  // Change password
  fastify.put('/me/password', authController.changePassword);

  // Get preferences
  fastify.get('/me/preferences', authController.getPreferences);

  // Update preferences
  fastify.put('/me/preferences', authController.updatePreferences);

  // Get current user profile
  fastify.get('/me/profile', async (request, reply) => {
    const user = request.user as any;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        professionalProfile: true,
        establishmentProfile: true,
      },
    });
    if (!dbUser) return reply.status(404).send({ error: 'Usuário não encontrado.' });
    return reply.send(dbUser);
  });

  // Update profile (name, phone, avatar, and professional fields)
  fastify.put('/me/profile', async (request, reply) => {
    const user = request.user as any;
    const { name, phone, avatar, specialty, bio, document } = (request.body as any) || {};

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await prisma.user.update({
      where: { id: user.sub },
      data: updateData,
      include: {
        professionalProfile: true,
        establishmentProfile: true,
      },
    });

    if (user.role === 'PROFESSIONAL' && (specialty !== undefined || bio !== undefined || document !== undefined)) {
      const profUpdate: any = {};
      if (specialty !== undefined) profUpdate.specialty = specialty;
      if (bio !== undefined) profUpdate.bio = bio;
      if (document !== undefined) profUpdate.document = document;

      const updatedProf = await prisma.professionalProfile.upsert({
        where: { userId: user.sub },
        update: profUpdate,
        create: {
          userId: user.sub,
          ...profUpdate,
        },
      });
      updatedUser.professionalProfile = updatedProf;
    }

    return reply.send({
      message: 'Perfil atualizado com sucesso.',
      user: updatedUser,
    });
  });

  // List payment methods
  fastify.get('/me/payment-methods', async (request, reply) => {
    const user = request.user as any;
    const methods = await prisma.paymentMethod.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(methods);
  });

  // Add payment method
  fastify.post('/me/payment-methods', async (request, reply) => {
    const user = request.user as any;
    const { brand, lastFour, holder } = request.body as any;

    if (!brand || !lastFour || !holder) {
      return reply.status(400).send({ error: 'Dados incompletos.' });
    }

    // If this is the first method, make it default
    const existingCount = await prisma.paymentMethod.count({ where: { userId: user.sub } });

    const method = await prisma.paymentMethod.create({
      data: {
        userId: user.sub,
        brand,
        lastFour: lastFour.slice(-4),
        holder,
        isDefault: existingCount === 0,
      },
    });
    return reply.status(201).send(method);
  });

  // Delete payment method (requires password confirmation)
  fastify.delete('/me/payment-methods/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params as any;
    const { password } = request.body as any || {};

    // Verify password
    const dbUser = await prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser) return reply.status(404).send({ error: 'Usuário não encontrado.' });

    if (password) {
      const isValid = await bcrypt.compare(password, dbUser.password);
      if (!isValid) {
        return reply.status(400).send({ error: 'Senha incorreta.' });
      }
    }

    const method = await prisma.paymentMethod.findFirst({
      where: { id, userId: user.sub },
    });
    if (!method) return reply.status(404).send({ error: 'Método de pagamento não encontrado.' });

    await prisma.paymentMethod.delete({ where: { id } });

    // If deleted was default, make the next one default
    if (method.isDefault) {
      const nextMethod = await prisma.paymentMethod.findFirst({ where: { userId: user.sub } });
      if (nextMethod) {
        await prisma.paymentMethod.update({ where: { id: nextMethod.id }, data: { isDefault: true } });
      }
    }

    return reply.send({ message: 'Removido com sucesso.' });
  });

  // Set default payment method
  fastify.put('/me/payment-methods/:id/default', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params as any;

    // Remove default from all
    await prisma.paymentMethod.updateMany({ where: { userId: user.sub }, data: { isDefault: false } });
    // Set new default
    await prisma.paymentMethod.update({ where: { id }, data: { isDefault: true } });

    return reply.send({ message: 'Padrão atualizado.' });
  });
};
