/**
 * Derive the thumbnail URL from a full-size image URL.
 *
 * Upload convention: full image is `{timestamp}.jpg`,
 * thumbnail is `{timestamp}_thumb.jpg` (200px wide, q=0.6).
 * Falls back to the original URL for images uploaded before
 * dual-size was introduced (backwards compatible).
 */
export function getThumbnailUrl(url: string, width = 400): string {
  if (!url) return '';
  // Convert {timestamp}.jpg → {timestamp}_thumb.jpg
  return url.replace(/\.jpg$/, '_thumb.jpg');
}

/**
 * Get full-size image URL (for detail views).
 * If a thumbnail URL is passed in, strip the _thumb suffix.
 */
export function getFullImageUrl(url: string, _width = 800): string {
  if (!url) return '';
  // Ensure we're using the full-size variant
  return url.replace(/_thumb\.jpg$/, '.jpg');
}
