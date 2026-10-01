import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import { useThemeStore } from '@shared/store/theme'
import { createAsyncStorage } from '@shared/storage'
import { Appearance, ColorSchemeName } from 'react-native'

const ThemeContext = createContext<ReturnType<typeof useThemeStore> | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeStore = useThemeStore.getState()

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      themeStore.setTheme(colorScheme === 'light' ? 'light' : 'dark')
    })
    return () => subscription.remove()
  }, [])

  return <ThemeContext.Provider value={useThemeStore.getState()}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}