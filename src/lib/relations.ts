export function relatedName(value: unknown, fallback: string) {
  const record = Array.isArray(value) ? value[0] : value

  if (!record || typeof record !== 'object') return fallback

  const name = (record as { name?: unknown; full_name?: unknown }).name ?? (record as { full_name?: unknown }).full_name
  return typeof name === 'string' && name.length > 0 ? name : fallback
}
