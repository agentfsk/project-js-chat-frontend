import { apiRequest } from './client'

export type AuthResponse = {
  token: string
  username: string
}

export function login(identifier: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export function signup(
  email: string,
  username: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  })
}