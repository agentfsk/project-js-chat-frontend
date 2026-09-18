import { io, type Socket } from 'socket.io-client'
import { useChatStore } from './store/chat'
import type { Attachment, Channel } from './types'

type AckPayload = { status: string; message?: string; data?: unknown }

let socket: Socket | null = null
let connected = false

export function connectSocket(): Socket | null {
  if (connected) return socket
  socket = io({ path: '/socket.io' })
  connected = true

  socket.on('newMessage', (message) => {
    useChatStore.getState().addMessage(message)
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