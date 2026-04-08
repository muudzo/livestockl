const SUPABASE_STORAGE_URL = 'https://hmeieslclzycyjjjflfh.supabase.co/storage/v1';

/**
 * Generate a thumbnail URL using Supabase Storage image transformations.
 * Falls back to original URL if not a Supabase storage URL.
 */
export function getThumbnailUrl(url: string, width = 400): string {
  if (!url) return '';

  // Only transform Supabase storage URLs
  if (!url.includes('supabase.co/storage')) return url;

  // Supabase render endpoint: /storage/v1/render/image/public/{bucket}/{path}
  // Replace /storage/v1/object/public/ with /storage/v1/render/image/public/
  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  // Add width parameter
  const separator = transformed.includes('?') ? '&' : '?';
  return `${transformed}${separator}width=${width}&resize=contain`;
}

/**
 * Get full-size image URL (for detail views).
 * Uses a larger width but still not the raw upload.
 */
export function getFullImageUrl(url: string, width = 800): string {
  return getThumbnailUrl(url, width);
}
