/**
 * Generate a thumbnail URL for a livestock image.
 *
 * NOTE: Supabase Storage Image Transformations (/render/image/ endpoint)
 * require a Pro plan. On the free tier those URLs 404, breaking all images.
 * We return the original URL as-is until the project is on a paid plan.
 */
export function getThumbnailUrl(url: string, _width = 400): string {
  if (!url) return '';
  return url;
}

/**
 * Get full-size image URL (for detail views).
 * Currently returns the original URL unchanged (see note above).
 */
export function getFullImageUrl(url: string, _width = 800): string {
  if (!url) return '';
  return url;
}
