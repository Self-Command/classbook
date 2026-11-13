export function emptyStringsToNull(body: unknown, keys: readonly string[]): unknown {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return body;
  }

  const copy: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of keys) {
    if (copy[key] === '') {
      copy[key] = null;
    }
  }
  return copy;
}
