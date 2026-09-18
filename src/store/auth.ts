import { create } from 'zustand'

const TOKEN_KEY = 'auth_token'
const USERNAME_KEY = 'auth_username'

type AuthState = {
  token: string | null
  username: string | null
  setSession: (token: string, username: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  username: localStorage.getItem(USERNAME_KEY),
  setSession: (token, username) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USERNAME_KEY, username)
    set({ token, username })
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    set({ token: null, username: null })
  },
}))