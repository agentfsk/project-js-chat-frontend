import { ApiError } from './client'
import { useAuthStore } from '../store/auth'
import type { Attachment } from '../types'

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

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

export async function uploadFile(file: File): Promise<Attachment> {
  const formData = new FormData()
  formData.append('file', file)

  const { token } = useAuthStore.getState()

  let response: Response
  try {
    response = await fetch('/api/v1/uploads', {
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

  return (await response.json()) as Attachment
}