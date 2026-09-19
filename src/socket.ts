import { io, type Socket } from 'socket.io-client'
import { BACKEND_URL } from './config'
import { useChatStore } from './store/chat'
import { useUsersStore } from './store/users'
import { useAuthStore } from './store/auth'
import type { Attachment, Channel, UserProfile } from './types'

type AckPayload = { status: string; message?: string; data?: unknown }

let socket: Socket | null = null
let connected = false

export function connectSocket(): Socket | null {
  if (connected) return socket
  const { token } = useAuthStore.getState()
  if (!token) return null
  socket = io(BACKEND_URL || undefined, { path: '/socket.io', auth: { token } })
  connected = true

  socket.on('newMessage', (payload) => {
    if (payload.channel) {
      useChatStore.getState().addChannel(payload.channel)
    }
    useChatStore.getState().addMessage(payload)
  })
  socket.on('newChannel', (channel) => {
    useChatStore.getState().addChannel(channel)
  })
  socket.on('renameChannel', (channel) => {
    useChatStore.getState().renameChannel(channel)
  })
  socket.on('removeChannel', ({ id }) => {
    useChatStore.getState().removeChannel(Number(id))
  })

  socket.on('contactRequest', (payload) => {
    const { requestId, from, channel } = payload as {
      requestId: number
      from: UserProfile
      channel: Channel
    }
    useUsersStore.getState().addRequest({ id: requestId, from, channelId: channel.id })
    useChatStore.getState().addChannel(channel)
  })
  socket.on('contactRequestResolved', ({ requestId }) => {
    useUsersStore.getState().removeRequest(Number(requestId))
  })
  socket.on('contactAdded', ({ profile }) => {
    useUsersStore.getState().addContact(profile)
  })
  socket.on('contactRemoved', ({ userId }) => {
    useUsersStore.getState().removeContact(Number(userId))
  })
  socket.on('userUpdated', (profile) => {
    useUsersStore.getState().applyUserUpdate(profile)
  })
  socket.on('connect_error', (err) => {
    if (err.message === 'unauthorized') {
      useAuthStore.getState().clear()
      disconnectSocket()
    }
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  connected = false
}

function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Нет соединения с сервером'))
      return
    }
    socket.emit(event, payload, (ack: AckPayload) => {
      if (ack && ack.status === 'ok') {
        resolve(ack.data as T)
      } else {
        reject(new Error(ack?.message ?? 'Ошибка при отправке'))
      }
    })
  })
}

export function emitNewMessage(
  body: string,
  channelId: number,
  username: string,
  attachment?: Attachment,
): Promise<void> {
  return emitWithAck<void>('newMessage', { body, channelId, username, attachment })
}

export function emitNewChannel(name: string): Promise<Channel> {
  return emitWithAck<Channel>('newChannel', { name })
}

export function emitRenameChannel(id: number, name: string): Promise<Channel> {
  return emitWithAck<Channel>('renameChannel', { id, name })
}

export function emitRemoveChannel(id: number): Promise<void> {
  return emitWithAck<void>('removeChannel', { id })
}