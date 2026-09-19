import { ApiError } from './client'
import { useAuthStore } from '../store/auth'
import type { Attachment } from '../types'

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

async function uploadMultipart(path: string, file: File): Promise<unknown> {
  const formData = new FormData()
  formData.append('file', file)

  const { token } = useAuthStore.getState()

  let response: Response
  try {
    response = await fetch(path, {
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

export async function uploadFile(file: File): Promise<Attachment> {
  return (await uploadMultipart('/api/v1/uploads', file)) as Attachment
}

export async function uploadAvatar(file: File): Promise<Attachment> {
  return (await uploadMultipart('/api/v1/avatars', file)) as Attachment
}