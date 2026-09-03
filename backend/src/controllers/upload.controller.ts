import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';

const UPLOAD_ROOT = path.join(__dirname, '../../../uploads');

export async function uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const data = await request.file();
  if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' });

  const ext = path.extname(data.filename) || '.jpg';
  const fileName = `${user.sub}-${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, 'avatars');
  fs.mkdirSync(dir, { recursive: true });

  const uploadPath = path.join(dir, fileName);
  await pipeline(data.file, fs.createWriteStream(uploadPath));

  const fileUrl = `/uploads/avatars/${fileName}`;
  await prisma.user.update({
    where: { id: user.sub },
    data: { avatar: fileUrl }
  });

  return reply.send({ url: fileUrl });
}

export async function removeAvatar(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  await prisma.user.update({
    where: { id: user.sub },
    data: { avatar: null }
  });
  return reply.send({ success: true });
}

export async function uploadPetPhoto(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const data = await request.file();
  if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' });

  const ext = path.extname(data.filename) || '.jpg';
  const fileName = `pet-${user.sub}-${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, 'pets');
  fs.mkdirSync(dir, { recursive: true });

  const uploadPath = path.join(dir, fileName);
  await pipeline(data.file, fs.createWriteStream(uploadPath));

  const fileUrl = `/uploads/pets/${fileName}`;
  return reply.send({ url: fileUrl });
}

export async function uploadImage(request: FastifyRequest, reply: FastifyReply) {
  const data = await request.file();
  if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' });

  const ext = path.extname(data.filename) || '.jpg';
  const fileName = `img-${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, 'images');
  fs.mkdirSync(dir, { recursive: true });

  const uploadPath = path.join(dir, fileName);
  await pipeline(data.file, fs.createWriteStream(uploadPath));

  const fileUrl = `/uploads/images/${fileName}`;
  return reply.send({ url: fileUrl });
}
