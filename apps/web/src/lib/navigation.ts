export function getSafeRedirect(value: string | null, fallback = '/'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (
    value === '/login' ||
    value.startsWith('/login?') ||
    value === '/register' ||
    value.startsWith('/register?')
  ) {
    return fallback;
  }
  return value;
}

export function withRedirect(path: string, redirect: string): string {
  if (!redirect || redirect === '/') return path;
  return `${path}?redirect=${encodeURIComponent(redirect)}`;
}
