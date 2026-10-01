export type AuthResponse = {
  token: string
  username: string
}

export function createAuthApi(apiRequest: (path: string, options?: RequestInit) => Promise<any>) {
  return {
    login: (identifier: string, password: string): Promise<AuthResponse> =>
      apiRequest('/api/v1/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      }),

    signup: (username: string, password: string): Promise<AuthResponse> =>
      apiRequest('/api/v1/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
  }
}