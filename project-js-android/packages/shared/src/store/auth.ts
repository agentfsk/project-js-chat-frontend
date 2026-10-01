import { create } from 'zustand'
import type { StorageAdapter } from '../storage'

const TOKEN_KEY = 'auth_token'
const USERNAME_KEY = 'auth_username'

type AuthState = {
  token: string | null
  username: string | null
  _storage: StorageAdapter | null
  initialize: (storage: StorageAdapter) => Promise<void>
  setSession: (token: string, username: string) => Promise<void>
  setUsername: (username: string) => Promise<void>
  clear: () => Promise<void>
}

function createAuthStoreImpl(storage: StorageAdapter) {
  return create<AuthState>()((set, get) => ({
    token: null,
    username: null,
    _storage: storage,
    initialize: async () => {
      const [token, username] = await Promise.all([
        storage.getItem(TOKEN_KEY),
        storage.getItem(USERNAME_KEY),
      ])
      set({ token, username, _storage: storage })
    },
    setSession: async (token, username) => {
      await Promise.all([
        storage.setItem(TOKEN_KEY, token),
        storage.setItem(USERNAME_KEY, username),
      ])
      set({ token, username })
    },
    setUsername: async (username) => {
      await storage.setItem(USERNAME_KEY, username)
      set({ username })
    },
    clear: async () => {
      await Promise.all([
        storage.removeItem(TOKEN_KEY),
        storage.removeItem(USERNAME_KEY),
      ])
      set({ token: null, username: null })
    },
  }))
}

export const createAuthStore = createAuthStoreImpl

// Export a ready-to-use store for web (using localStorage)
import { createWebStorage } from '../storage'
export const useAuthStore = createAuthStoreImpl(createWebStorage())

export type UseAuthStore = ReturnType<typeof createAuthStoreImpl>