import { useAuthStore } from '../store/auth'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuthStore.getState()
  const headers = new Headers(options.headers)
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(path, { ...options, headers })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к серверу')
  }

  if (response.status === 401) {
    useAuthStore.getState().clear()
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Ошибка запроса (${response.status})`)
  }

  return (await response.json()) as T
}