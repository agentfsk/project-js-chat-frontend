import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import { useAuthStore } from '@shared/store/auth'
import { useChatStore } from '@shared/store/chat'
import { useUnreadStore } from '@shared/store/unread'
import { useUsersStore } from '@shared/store/users'
import { useToastStore } from '@shared/store/toasts'
import { initSocket, connectSocket, disconnectSocket, type Socket } from '@shared/socket'
import { BACKEND_URL } from '@shared/config'

const SocketContext = createContext<{ connect: () => Promise<Socket | null>; disconnect: () => void } | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const chatStore = useChatStore.getState()
  const unreadStore = useUnreadStore.getState()
  const usersStore = useUsersStore.getState()
  const toastStore = useToastStore.getState()

  useEffect(() => {
    initSocket(
      BACKEND_URL || 'http://localhost:5001',
      () => Promise.resolve(useAuthStore.getState().token),
      {
        chat: chatStore,
        unread: unreadStore,
        users: usersStore,
        toasts: toastStore,
      }
    )
  }, [])

  useEffect(() => {
    if (token) {
      connectSocket()
    } else {
      disconnectSocket()
    }
  }, [token])

  return <SocketContext.Provider value={{ connect: connectSocket, disconnect: disconnectSocket }}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) throw new Error('useSocket must be used within SocketProvider')
  return context
}