import { BACKEND_URL } from '../config'

export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (BACKEND_URL && url.startsWith('/uploads/')) {
    return `${BACKEND_URL}${url}`
  }
  return url
}