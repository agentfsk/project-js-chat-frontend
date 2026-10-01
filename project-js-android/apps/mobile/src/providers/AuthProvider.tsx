import React, { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '@shared/store/auth'
import { createAsyncStorage } from '@shared/storage'

const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore

  React.useEffect(() => {
    authStore.getState().initialize(createAsyncStorage())
  }, [])

  return <AuthContext.Provider value={authStore.getState()}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}