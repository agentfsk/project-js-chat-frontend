import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { RootNavigator } from './navigation/RootNavigator'
import { AuthProvider } from './providers/AuthProvider'
import { SocketProvider } from './providers/SocketProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { PermissionsProvider } from './providers/PermissionsProvider'
import { useAuthStore } from '@shared/store/auth'
import { createAsyncStorage } from '@shared/storage'

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initializeAuth(createAsyncStorage())
  }, [initializeAuth])

  return (
    <NavigationContainer>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider>
            <PermissionsProvider>
              <RootNavigator />
              <StatusBar />
            </PermissionsProvider>
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </NavigationContainer>
  )
}