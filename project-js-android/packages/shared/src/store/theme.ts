import { create } from 'zustand'

const THEME_KEY = 'theme_pref'

export type Theme = 'dark' | 'light'

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

function readStoredTheme(storage: { getItem: (key: string) => Promise<string | null> }): Promise<Theme> {
  return storage.getItem(THEME_KEY).then((v) => (v === 'light' ? 'light' : 'dark'))
}

function createThemeStoreImpl(storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> }) {
  return create<ThemeState>()((set) => ({
    theme: 'dark',
    setTheme: async (theme) => {
      await storage.setItem(THEME_KEY, theme)
      applyTheme(theme)
      set({ theme })
    },
  }))
}

export const createThemeStore = createThemeStoreImpl

import { createWebStorage } from '../storage'
export const useThemeStore = createThemeStoreImpl(createWebStorage())

export type UseThemeStore = ReturnType<typeof createThemeStoreImpl>