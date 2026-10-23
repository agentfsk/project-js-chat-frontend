const configuredMediaServerUrl = import.meta.env.VITE_MEDIA_SERVER_URL?.trim()

export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')
export const MEDIA_SERVER_URL = (
  configuredMediaServerUrl ?? 'http://localhost:3001'
).replace(/\/$/, '')

if (import.meta.env.PROD && !configuredMediaServerUrl) {
  console.error(
    '[config] VITE_MEDIA_SERVER_URL is not set. Group calls will try http://localhost:3001. ' +
    'Set this variable in the hosting provider settings (it is inlined at build time) and redeploy.',
  )
}
