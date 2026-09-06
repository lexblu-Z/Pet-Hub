import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import path from 'path';

export interface EasterEggMediaItem {
  id: string;
  type: 'image' | 'video' | 'carousel';
  title: string;
  url?: string;
  cover?: string;
  items?: string[];
  count?: number;
}

export const easterEggRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', async (request, reply) => {
    try {
      const easterEggDir = path.join(__dirname, '../../../uploads/easter-egg´s');

      if (!fs.existsSync(easterEggDir)) {
        return reply.send({ items: [] });
      }

      const entries = fs.readdirSync(easterEggDir, { withFileTypes: true });

      const carousels: EasterEggMediaItem[] = [];
      const videos: EasterEggMediaItem[] = [];
      const images: EasterEggMediaItem[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.toLowerCase().startsWith('carrossel')) {
          const carouselPath = path.join(easterEggDir, entry.name);
          const cFiles = fs
            .readdirSync(carouselPath)
            .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
            .sort();

          if (cFiles.length > 0) {
            const slideUrls = cFiles.map(
              (f) => `/uploads/easter-egg%C2%B4s/${encodeURIComponent(entry.name)}/${encodeURIComponent(f)}`
            );
            carousels.push({
              id: entry.name,
              type: 'carousel',
              title: `Carrossel ${entry.name.replace(/\D/g, '')}`,
              cover: slideUrls[0],
              items: slideUrls,
              count: slideUrls.length,
            });
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ext === '.lnk') continue; // Ignore windows shortcuts

          const fileUrl = `/uploads/easter-egg%C2%B4s/${encodeURIComponent(entry.name)}`;
          const id = path.basename(entry.name, ext);

          if (ext === '.mp4' || ext === '.webm') {
            videos.push({
              id,
              type: 'video',
              title: 'Vídeo PetHub',
              url: fileUrl,
            });
          } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            images.push({
              id,
              type: 'image',
              title: 'Foto PetHub',
              url: fileUrl,
            });
          }
        }
      }

      // Sort carousels numerically
      carousels.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });

      // Interleave items organically for a balanced Pinterest mural feed
      const feedItems: EasterEggMediaItem[] = [];
      let cIdx = 0;
      let vIdx = 0;
      let imgIdx = 0;

      while (cIdx < carousels.length || vIdx < videos.length || imgIdx < images.length) {
        // Add 2-3 images
        for (let i = 0; i < 3 && imgIdx < images.length; i++) {
          feedItems.push(images[imgIdx++]);
        }
        // Add 1 carousel if available
        if (cIdx < carousels.length) {
          feedItems.push(carousels[cIdx++]);
        }
        // Add 2 images
        for (let i = 0; i < 2 && imgIdx < images.length; i++) {
          feedItems.push(images[imgIdx++]);
        }
        // Add 1 video if available
        if (vIdx < videos.length) {
          feedItems.push(videos[vIdx++]);
        }
      }

      return reply.send({
        items: feedItems,
        total: feedItems.length,
        stats: {
          carousels: carousels.length,
          videos: videos.length,
          images: images.length,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao carregar conteúdo do Easter Egg.' });
    }
  });
};
