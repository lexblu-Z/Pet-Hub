/**
 * Normalizes an image URL from the PetHub backend, external URL, or static asset.
 * If the path starts with '/uploads', prepends the API host (http://localhost:3000 in dev or VITE_API_URL).
 */
export function getFullImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // Handle JSON stringified arrays: '["/uploads/..."]'
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        trimmed = parsed[0].trim();
      }
    } catch {}
  }

  // Already a full external or data URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Normalize relative uploads path without leading slash
  if (trimmed.startsWith('uploads/')) {
    trimmed = `/${trimmed}`;
  }

  // Local uploads served by Fastify staticPlugin
  if (trimmed.startsWith('/uploads')) {
    const apiEnv = import.meta.env.VITE_API_URL;
    const baseUrl = apiEnv ? apiEnv.replace(/\/api\/?$/, '') : 'http://localhost:3000';
    return `${baseUrl}${trimmed}`;
  }

  return trimmed;
}

/**
 * Extracts and resolves the primary photo for a product from any format:
 * - product.photo (string)
 * - product.photos (array of strings, or JSON string)
 * - product.imageUrl / product.image
 * Returns the fully qualified image URL or null if none available.
 */
export function getProductPhoto(product: any): string | null {
  if (!product) return null;

  let rawPhoto: string | null = null;

  // 1. Array of photos (photos: ["..."])
  if (Array.isArray(product.photos) && product.photos.length > 0) {
    const firstValid = product.photos.find((p: any) => typeof p === 'string' && p.trim().length > 0);
    if (firstValid) rawPhoto = firstValid.trim();
  }

  // 2. Direct photo field (photo: "...")
  if (!rawPhoto && typeof product.photo === 'string' && product.photo.trim().length > 0) {
    rawPhoto = product.photo.trim();
  }

  // 3. String photos (if photos was stored as string or JSON string)
  if (!rawPhoto && typeof product.photos === 'string' && product.photos.trim().length > 0) {
    const trimmed = product.photos.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed.find((p: any) => typeof p === 'string' && p.trim().length > 0);
          if (first) rawPhoto = first.trim();
        }
      } catch {}
    } else {
      rawPhoto = trimmed;
    }
  }

  // 4. Fallbacks (imageUrl / image)
  if (!rawPhoto && typeof product.imageUrl === 'string' && product.imageUrl.trim().length > 0) {
    rawPhoto = product.imageUrl.trim();
  }
  if (!rawPhoto && typeof product.image === 'string' && product.image.trim().length > 0) {
    rawPhoto = product.image.trim();
  }

  if (!rawPhoto) return null;

  const resolved = getFullImageUrl(rawPhoto);
  return resolved || null;
}


/**
 * Resolves the primary photo for an establishment or professional provider.
 * Follows the PetHub hierarchy:
 * 1. First photo from establishmentProfile.photos array
 * 2. Workplace photo for independent professionals
 * 3. User avatar
 * 4. null if no photo is configured
 */
export function getProviderPhoto(provider: any): string | null {
  if (!provider) return null;

  if (Array.isArray(provider.photos) && provider.photos.length > 0 && provider.photos[0]) {
    return provider.photos[0];
  }
  if (provider.establishmentProfile?.photos && Array.isArray(provider.establishmentProfile.photos) && provider.establishmentProfile.photos.length > 0) {
    return provider.establishmentProfile.photos[0];
  }
  if (provider.workplacePhoto) {
    return provider.workplacePhoto;
  }
  if (provider.professionalProfile?.workplacePhoto) {
    return provider.professionalProfile.workplacePhoto;
  }
  if (provider.coverPhoto && !provider.coverPhoto.includes('jorginho') && !provider.coverPhoto.includes('salsicha')) {
    return provider.coverPhoto;
  }
  if (provider.cover && !provider.cover.includes('jorginho') && !provider.cover.includes('salsicha')) {
    return provider.cover;
  }
  if (provider.avatar) {
    return provider.avatar;
  }
  if (provider.logo && !provider.logo.includes('salsicha') && !provider.logo.includes('jorginho')) {
    return provider.logo;
  }

  return null;
}
