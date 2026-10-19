import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { getProductPhoto, getFullImageUrl } from '@/utils/image';

interface ProductImageProps {
  product?: any;
  src?: string | null;
  alt?: string;
  className?: string;
  iconSize?: number;
  containerClassName?: string;
}

/**
 * Robust product image renderer for PetHub.
 * Automatically handles:
 * - Direct image URL / path (with getFullImageUrl)
 * - Nested product objects with `photo`, `photos` array, or fallback fields
 * - Graceful fallback on missing image or load errors (no broken image icons!)
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  product,
  src,
  alt = 'Produto',
  className = 'w-full h-full object-cover',
  iconSize = 20,
  containerClassName = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Resolve the source URL from src prop or from the product object
  const resolvedSrc = src ? getFullImageUrl(src) : getProductPhoto(product);

  // Reset error status if the resolved source changes
  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-100 dark:bg-[#282A2C] text-neutral-400 dark:text-[#8E918F] w-full h-full select-none ${containerClassName}`}
        title={alt}
      >
        <Package size={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};
