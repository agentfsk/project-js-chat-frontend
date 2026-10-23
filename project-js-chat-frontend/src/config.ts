export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')
export const MEDIA_SERVER_URL = (
  import.meta.env.VITE_MEDIA_SERVER_URL ?? 'http://localhost:3001'
).replace(/\/$/, '')
