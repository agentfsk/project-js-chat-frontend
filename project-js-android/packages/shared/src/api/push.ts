export function createPushApi(apiRequest: (path: string, options?: RequestInit) => Promise<any>) {
  return {
    registerPushToken: (token: string): Promise<{ ok: true }> =>
      apiRequest('/api/v1/push-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),

    updatePushToken: (token: string): Promise<{ ok: true }> =>
      apiRequest('/api/v1/push-token', {
        method: 'PATCH',
        body: JSON.stringify({ token }),
      }),
  }
}