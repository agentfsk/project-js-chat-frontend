export function resolveMediaUrl(url: string | null | undefined, backendUrl?: string): string | undefined {
  if (!url) return undefined
  if (backendUrl && url.startsWith('/uploads/')) {
    return `${backendUrl}${url}`
  }
  return url
}