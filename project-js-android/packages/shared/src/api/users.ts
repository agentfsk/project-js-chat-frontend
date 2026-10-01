import type { Channel, UserProfile } from '../types'

export type ContactRequestResult = {
  requestId: number | null
  channel: Channel
  status: 'pending' | 'accepted'
}

export function createUsersApi(apiRequest: (path: string, options?: RequestInit) => Promise<any>) {
  return {
    searchUsers: (query: string): Promise<UserProfile[]> =>
      apiRequest(`/api/v1/users/search?query=${encodeURIComponent(query)}`),

    updateProfile: (payload: { username?: string; avatarUrl?: string | null }): Promise<UserProfile> =>
      apiRequest('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    createPrivateChannel: (userId: number): Promise<{ channel: Channel }> =>
      apiRequest('/api/v1/private-channels', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),

    sendContactRequest: (userId: number): Promise<ContactRequestResult> =>
      apiRequest('/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),

    resolveContactRequest: (requestId: number, action: 'accept' | 'decline'): Promise<{ ok: true }> =>
      apiRequest(`/api/v1/contacts/${requestId}/${action}`, {
        method: 'POST',
      }),

    removeContact: (userId: number): Promise<{ ok: true }> =>
      apiRequest(`/api/v1/contacts/${userId}`, {
        method: 'DELETE',
      }),
  }
}