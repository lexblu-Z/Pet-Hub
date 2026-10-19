import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export const userAddressController = {
  // GET /api/users/me/addresses
  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const userId = user?.sub || user?.id;

    let addresses = await prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // Auto-migrate from User if no addresses exist yet
    if (addresses.length === 0) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          address: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          zipCode: true,
        },
      });

      if (dbUser && dbUser.address && dbUser.number) {
        const seeded = await prisma.userAddress.create({
          data: {
            userId,
            label: 'Principal',
            street: dbUser.address,
            number: dbUser.number,
            complement: dbUser.complement || null,
            neighborhood: dbUser.neighborhood || 'Centro',
            city: dbUser.city || 'Ourinhos',
            state: dbUser.state || 'SP',
            zipCode: dbUser.zipCode || '19900-000',
            isDefault: true,
          },
        });
        addresses = [seeded];
      }
    }

    return reply.send(addresses);
  },

  // POST /api/users/me/addresses
  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    const userId = user?.sub || user?.id;
    const body = (request.body as any) || {};

    const { label, street, number, complement, neighborhood, city, state, zipCode, isDefault } = body;

    if (!street?.trim() || !number?.trim() || !neighborhood?.trim() || !zipCode?.trim()) {
      return reply.status(400).send({ error: 'Preencha todos os campos obrigatórios do endereço (rua, número, bairro e CEP).' });
    }

    const cleanCep = String(zipCode).replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return reply.status(400).send({ error: 'CEP inválido. Deve conter 8 dígitos.' });
    }

    const cepPrefix = parseInt(cleanCep.slice(0, 5), 10);
    if (cepPrefix < 19900 || cepPrefix > 19919) {
      return reply.status(400).send({ error: 'O PetHub realiza entregas apenas em Ourinhos - SP (faixa de CEP 19900-000 a 19919-999).' });
    }

    const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
    const finalCity = (city?.trim() || 'Ourinhos');
    const finalState = (state?.trim() || 'SP');

    if (finalCity.toLowerCase() !== 'ourinhos' || finalState.toUpperCase() !== 'SP') {
      return reply.status(400).send({ error: 'O PetHub realiza entregas apenas em Ourinhos - SP.' });
    }

    const existingCount = await prisma.userAddress.count({ where: { userId } });
    const shouldBeDefault = existingCount === 0 || Boolean(isDefault);

    if (shouldBeDefault) {
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.userAddress.create({
      data: {
        userId,
        label: label?.trim() || 'Casa',
        street: street.trim(),
        number: String(number).trim(),
        complement: complement ? String(complement).trim() : null,
        neighborhood: neighborhood.trim(),
        city: 'Ourinhos',
        state: 'SP',
        zipCode: formattedCep,
        isDefault: shouldBeDefault,
      },
    });

    if (shouldBeDefault) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          address: newAddress.street,
          number: newAddress.number,
          complement: newAddress.complement,
          neighborhood: newAddress.neighborhood,
          city: newAddress.city,
          state: newAddress.state,
          zipCode: newAddress.zipCode,
        },
      });
    }

    return reply.status(201).send({
      message: 'Endereço cadastrado com sucesso.',
      address: newAddress,
    });
  },

  // PUT /api/users/me/addresses/:id
  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const userId = user?.sub || user?.id;
    const { id } = request.params;
    const body = (request.body as any) || {};

    const existing = await prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Endereço não encontrado ou você não tem permissão para alterá-lo.' });
    }

    const { label, street, number, complement, neighborhood, city, state, zipCode, isDefault } = body;

    if (!street?.trim() || !number?.trim() || !neighborhood?.trim() || !zipCode?.trim()) {
      return reply.status(400).send({ error: 'Preencha todos os campos obrigatórios do endereço.' });
    }

    const cleanCep = String(zipCode).replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return reply.status(400).send({ error: 'CEP inválido. Deve conter 8 dígitos.' });
    }

    const cepPrefix = parseInt(cleanCep.slice(0, 5), 10);
    if (cepPrefix < 19900 || cepPrefix > 19919) {
      return reply.status(400).send({ error: 'O PetHub realiza entregas apenas em Ourinhos - SP.' });
    }

    const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
    const willBeDefault = isDefault !== undefined ? Boolean(isDefault) : existing.isDefault;

    if (willBeDefault && !existing.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.userAddress.update({
      where: { id },
      data: {
        label: label !== undefined ? label?.trim() || 'Casa' : existing.label,
        street: street.trim(),
        number: String(number).trim(),
        complement: complement !== undefined ? (complement ? String(complement).trim() : null) : existing.complement,
        neighborhood: neighborhood.trim(),
        city: 'Ourinhos',
        state: 'SP',
        zipCode: formattedCep,
        isDefault: willBeDefault,
      },
    });

    if (willBeDefault) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          address: updated.street,
          number: updated.number,
          complement: updated.complement,
          neighborhood: updated.neighborhood,
          city: updated.city,
          state: updated.state,
          zipCode: updated.zipCode,
        },
      });
    }

    return reply.send({
      message: 'Endereço atualizado com sucesso.',
      address: updated,
    });
  },

  // DELETE /api/users/me/addresses/:id
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const userId = user?.sub || user?.id;
    const { id } = request.params;

    const existing = await prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Endereço não encontrado ou você não tem permissão para excluí-lo.' });
    }

    const wasDefault = existing.isDefault;

    await prisma.userAddress.delete({
      where: { id },
    });

    if (wasDefault) {
      const nextAddress = await prisma.userAddress.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      if (nextAddress) {
        await prisma.userAddress.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });

        await prisma.user.update({
          where: { id: userId },
          data: {
            address: nextAddress.street,
            number: nextAddress.number,
            complement: nextAddress.complement,
            neighborhood: nextAddress.neighborhood,
            city: nextAddress.city,
            state: nextAddress.state,
            zipCode: nextAddress.zipCode,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: {
            address: null,
            number: null,
            complement: null,
            neighborhood: null,
            city: null,
            state: null,
            zipCode: null,
          },
        });
      }
    }

    return reply.send({
      success: true,
      message: 'Endereço excluído com sucesso.',
    });
  },

  // PATCH /api/users/me/addresses/:id/default
  async setDefault(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as any;
    const userId = user?.sub || user?.id;
    const { id } = request.params;

    const existing = await prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Endereço não encontrado.' });
    }

    await prisma.userAddress.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const updated = await prisma.userAddress.update({
      where: { id },
      data: { isDefault: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        address: updated.street,
        number: updated.number,
        complement: updated.complement,
        neighborhood: updated.neighborhood,
        city: updated.city,
        state: updated.state,
        zipCode: updated.zipCode,
      },
    });

    return reply.send({
      success: true,
      message: 'Endereço definido como principal.',
      address: updated,
    });
  },
};
