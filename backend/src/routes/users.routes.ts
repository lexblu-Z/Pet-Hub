import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authController } from '../controllers/auth.controller';
import { userAddressController } from '../controllers/userAddress.controller';
import { prisma } from '../lib/prisma';
import { validateAndNormalizeDocument } from '../utils/documentValidation';
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

  // Update profile (name, phone, avatar, document, and professional fields)
  fastify.put('/me/profile', async (request, reply) => {
    const user = request.user as any;
    const { name, phone, avatar, specialty, bio, document, acceptedSpecies, address, number, complement, neighborhood, city, state, zipCode } = (request.body as any) || {};

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (document !== undefined && document !== null && String(document).trim()) {
      const docResult = validateAndNormalizeDocument(String(document), user.role === 'ESTABLISHMENT' ? 'auto' : 'cpf');
      if (!docResult.isValid) {
        return reply.status(400).send({ error: docResult.error || 'Documento (CPF/CNPJ) inválido.' });
      }
      const cleanDoc = docResult.normalized;

      const dupUser = await prisma.user.findFirst({
        where: { document: cleanDoc, id: { not: user.sub } },
      });
      const dupProf = await prisma.professionalProfile.findFirst({
        where: { document: cleanDoc, userId: { not: user.sub } },
      });
      const dupEstab = await prisma.establishmentProfile.findFirst({
        where: { document: cleanDoc, userId: { not: user.sub } },
      });
      if (dupUser || dupProf || dupEstab) {
        return reply.status(409).send({ error: 'Este documento (CPF/CNPJ) já está cadastrado na plataforma.' });
      }
      updateData.document = cleanDoc;
    }

    if (address !== undefined) updateData.address = address?.trim() || null;
    if (number !== undefined) updateData.number = number?.trim() || null;
    if (complement !== undefined) updateData.complement = complement?.trim() || null;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (zipCode !== undefined) updateData.zipCode = zipCode?.trim() || null;

    const updatedUser = await prisma.user.update({
      where: { id: user.sub },
      data: updateData,
      include: {
        professionalProfile: true,
        establishmentProfile: true,
      },
    });

    if (user.role === 'PROFESSIONAL' && (specialty !== undefined || bio !== undefined || document !== undefined || acceptedSpecies !== undefined)) {
      const profUpdate: any = {};
      if (specialty !== undefined) profUpdate.specialty = specialty;
      if (bio !== undefined) profUpdate.bio = bio;
      if (document !== undefined) profUpdate.document = document;
      if (acceptedSpecies !== undefined) profUpdate.acceptedSpecies = acceptedSpecies;

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

  // Address Management (Multiple addresses)
  fastify.get('/me/addresses', userAddressController.list);
  fastify.post('/me/addresses', userAddressController.create);
  fastify.put('/me/addresses/:id', userAddressController.update as any);
  fastify.delete('/me/addresses/:id', userAddressController.delete as any);
  fastify.patch('/me/addresses/:id/default', userAddressController.setDefault as any);
  fastify.put('/me/addresses/:id/default', userAddressController.setDefault as any);

  // Dedicated Address update endpoint for Tutor and Checkout (maintains backward compatibility)
  fastify.put('/me/address', async (request, reply) => {
    const user = request.user as any;
    const userId = user?.sub || user?.id;
    const body = (request.body as any) || {};
    const street = body.street || body.address;
    const number = body.number;
    const complement = body.complement;
    const neighborhood = body.neighborhood;
    const city = body.city || 'Ourinhos';
    const state = body.state || 'SP';
    const zipCode = body.zipCode;

    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      return reply.status(400).send({ error: 'Preencha todos os campos obrigatórios do endereço.' });
    }

    if (city.trim().toLowerCase() !== 'ourinhos' || state.trim().toUpperCase() !== 'SP') {
      return reply.status(400).send({ error: 'O PetHub realiza entregas apenas em Ourinhos - SP.' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        address: street.trim(),
        number: String(number).trim(),
        complement: complement ? String(complement).trim() : null,
        neighborhood: String(neighborhood).trim(),
        city: 'Ourinhos',
        state: 'SP',
        zipCode: String(zipCode).trim(),
      },
    });

    try {
      const defaultAddr = await prisma.userAddress.findFirst({
        where: { userId, isDefault: true },
      });
      if (defaultAddr) {
        await prisma.userAddress.update({
          where: { id: defaultAddr.id },
          data: {
            street: street.trim(),
            number: String(number).trim(),
            complement: complement ? String(complement).trim() : null,
            neighborhood: String(neighborhood).trim(),
            city: 'Ourinhos',
            state: 'SP',
            zipCode: String(zipCode).trim(),
          },
        });
      } else {
        await prisma.userAddress.create({
          data: {
            userId,
            label: 'Principal',
            street: street.trim(),
            number: String(number).trim(),
            complement: complement ? String(complement).trim() : null,
            neighborhood: String(neighborhood).trim(),
            city: 'Ourinhos',
            state: 'SP',
            zipCode: String(zipCode).trim(),
            isDefault: true,
          },
        });
      }
    } catch {
      // Don't fail the request if address sync hits an edge case
    }

    return reply.send({
      success: true,
      message: 'Endereço atualizado com sucesso.',
      user: updated,
    });
  });

  // Saved Cards (Disabled for safety and compliance)
  fastify.get('/me/payment-methods', async (_request, reply) => {
    return reply.send([]);
  });

  fastify.post('/me/payment-methods', async (_request, reply) => {
    return reply.status(400).send({ error: 'A funcionalidade de salvar cartões foi descontinuada.' });
  });

  fastify.delete('/me/payment-methods/:id', async (_request, reply) => {
    return reply.send({ message: 'Cartão removido.' });
  });

  fastify.put('/me/payment-methods/:id/default', async (_request, reply) => {
    return reply.send({ message: 'Padrão atualizado.' });
  });
};
