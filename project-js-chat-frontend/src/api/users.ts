import { apiRequest } from './client'
import type { Channel, UserProfile } from '../types'

export function searchUsers(query: string): Promise<UserProfile[]> {
  return apiRequest<UserProfile[]>(`/api/v1/users/search?query=${encodeURIComponent(query)}`)
}

export function updateProfile(payload: { username?: string; avatarUrl?: string | null }): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function createPrivateChannel(userId: number): Promise<{ channel: Channel }> {
  return apiRequest<{ channel: Channel }>('/api/v1/private-channels', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export type ContactRequestResult = {
  requestId: number | null
  channel: Channel
  status: 'pending' | 'accepted'
}

export function sendContactRequest(userId: number): Promise<ContactRequestResult> {
  return apiRequest<ContactRequestResult>('/api/v1/contacts', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function resolveContactRequest(requestId: number, action: 'accept' | 'decline'): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/api/v1/contacts/${requestId}/${action}`, {
    method: 'POST',
  })
}

export function removeContact(userId: number): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/api/v1/contacts/${userId}`, {
    method: 'DELETE',
  })
}