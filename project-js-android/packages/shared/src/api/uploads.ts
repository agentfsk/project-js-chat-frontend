import { ApiError } from './client'

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
export const MAX_AVATAR_SIZE = 1 * 1024 * 1024

export const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/pdf',
])

export const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

export type UploadFileInput = {
  uri: string
  name: string
  type: string
}

export function createUploadsApi(
  backendUrl: string,
  getToken: () => Promise<string | null>
) {
  async function uploadMultipart(path: string, file: UploadFileInput): Promise<any> {
    const formData = new FormData()
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any)

    const token = await getToken()

    let response: Response
    try {
      response = await fetch(`${backendUrl}${path}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
    } catch {
      throw new ApiError(0, 'Не удалось подключиться к серверу')
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null
      throw new ApiError(response.status, body?.message ?? `Ошибка загрузки файла (${response.status})`)
    }

    return response.json()
  }

  return {
    uploadFile: (file: UploadFileInput) => uploadMultipart('/api/v1/uploads', file),
    uploadAvatar: (file: UploadFileInput) => uploadMultipart('/api/v1/avatars', file),
  }
}