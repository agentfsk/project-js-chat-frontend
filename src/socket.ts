import { io, type Socket } from 'socket.io-client'
import { BACKEND_URL } from './config'
import { useChatStore } from './store/chat'
import { useUsersStore } from './store/users'
import { useAuthStore } from './store/auth'
import * as callManager from './callManager'
import type { Attachment, CallMode, CallSignalData, Channel, UserProfile } from './types'

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
  socket.on('messageEdited', (message) => {
    useChatStore.getState().updateMessage(message)
  })
  socket.on('messageDeleted', ({ messageId }) => {
    useChatStore.getState().removeMessage(Number(messageId))
  })
  socket.on('messagePinned', ({ messageId, pinned }) => {
    useChatStore.getState().setMessagePinned(Number(messageId), Boolean(pinned))
  })
  socket.on('messageReacted', (message) => {
    useChatStore.getState().updateMessage(message)
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
  socket.on('callIncoming', (payload) => {
    callManager.onCallIncoming(payload)
  })
  socket.on('callAnswered', (payload) => {
    callManager.onCallAnswered(payload)
  })
  socket.on('callSignal', (payload) => {
    callManager.onCallSignal(payload)
  })
  socket.on('callRejected', (payload) => {
    callManager.onCallRejected(payload)
  })
  socket.on('callEnded', (payload) => {
    callManager.onCallEnded(payload)
  })
  socket.on('callActive', (payload) => {
    callManager.onCallActive(payload)
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
  callManager.onSocketClosed()
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
  replyToId?: number,
): Promise<void> {
  return emitWithAck<void>('newMessage', { body, channelId, username, attachment, replyToId })
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

export function emitEditMessage(messageId: number, body: string): Promise<void> {
  return emitWithAck<void>('editMessage', { messageId, body })
}

export function emitDeleteMessage(messageId: number): Promise<void> {
  return emitWithAck<void>('deleteMessage', { messageId })
}

export function emitPinMessage(messageId: number, pinned: boolean): Promise<void> {
  return emitWithAck<void>('pinMessage', { messageId, pinned })
}

export function emitToggleReaction(messageId: number, emoji: string): Promise<void> {
  return emitWithAck<void>('toggleReaction', { messageId, emoji })
}

export function emitCallOffer(payload: {
  callId: string
  channelId: number
  mode: CallMode
  sdp: string
}): Promise<{ outcome: 'ringing' | 'offline' | 'busy' }> {
  return emitWithAck<{ outcome: 'ringing' | 'offline' | 'busy' }>('callOffer', payload)
}

export function emitCallAnswer(callId: string, sdp: string): Promise<void> {
  return emitWithAck<void>('callAnswer', { callId, sdp })
}

export function emitCallSignal(callId: string, data: CallSignalData): Promise<void> {
  return emitWithAck<void>('callSignal', { callId, data })
}

export function emitCallReject(callId: string): Promise<void> {
  return emitWithAck<void>('callReject', { callId })
}

export function emitCallHangup(callId: string, reason: string): Promise<void> {
  return emitWithAck<void>('callHangup', { callId, reason })
}