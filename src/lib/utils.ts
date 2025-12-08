import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Optimize Supabase Storage image URLs by adding transformation parameters
 * to reduce bandwidth and improve loading speeds
 */
export function optimizeImageUrl(
  url: string | null,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
  } = {}
): string {
  if (!url || !url.includes('supabase')) {
    return url || '/placeholder.svg';
  }

  const { width, height, quality = 80, format = 'webp' } = options;

  // Add transformation parameters to Supabase Storage URLs
  const separator = url.includes('?') ? '&' : '?';
  let transformParams = `quality=${quality}&format=${format}`;

  if (width) transformParams += `&width=${width}`;
  if (height) transformParams += `&height=${height}`;

  return `${url}${separator}${transformParams}`;
}
