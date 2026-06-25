/**
 * Converts API-relative image paths (e.g. /uploads/image.jpg) to full URLs
 * pointing at the backend server.
 *
 * If the path is already an absolute URL (http/https), it is returned as-is.
 * Returns an empty string for falsy values so callers can use it in conditionals.
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const baseUrl = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  ).replace(/\/api\/?$/, ''); // strip trailing /api if present

  // Ensure a single leading slash between base and path
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalised}`;
}
