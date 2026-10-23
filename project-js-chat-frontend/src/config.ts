export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')

// Optional: the web client uses peer-to-peer mesh for group calls and does not
// need the media server. Kept for deployments that opt into the SFU path.
export const MEDIA_SERVER_URL = (
  import.meta.env.VITE_MEDIA_SERVER_URL ?? 'http://localhost:3001'
).replace(/\/$/, '')
