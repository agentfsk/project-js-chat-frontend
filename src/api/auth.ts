import { apiRequest } from './client'

export type AuthResponse = {
  token: string
  username: string
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function signup(username: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}