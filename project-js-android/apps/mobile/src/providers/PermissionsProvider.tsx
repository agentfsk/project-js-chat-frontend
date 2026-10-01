import React, { createContext, useContext, ReactNode } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'

const PermissionsContext = createContext<{
  requestCameraPermission: () => Promise<boolean>
  requestAudioPermission: () => Promise<boolean>
  requestNotificationPermission: () => Promise<boolean>
} | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    return true
  }

  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    return true
  }

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    return true
  }

  return (
    <PermissionsContext.Provider value={{ requestCameraPermission, requestAudioPermission, requestNotificationPermission }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) throw new Error('usePermissions must be used within PermissionsProvider')
  return context
}