import { apiRequest } from './client'
import type { CallKeyPackage, PreKeyBundle } from '../types'

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
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export function uploadPreKeys(keyPackage: CallKeyPackage): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/v1/keys/prekeys', {
    method: 'POST',
    body: JSON.stringify(keyPackage),
  })
}

export function fetchKeyBundle(userId: number): Promise<PreKeyBundle> {
  return apiRequest<PreKeyBundle>(`/api/v1/keys/bundle/${userId}`, {
    method: 'GET',
  })
}

export function rotateIdentityKey(identityKey: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/v1/keys/identity', {
    method: 'POST',
    body: JSON.stringify({ identityKey }),
  })
}