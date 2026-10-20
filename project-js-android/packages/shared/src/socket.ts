import { io, type Socket } from 'socket.io-client'
export type { Socket } from 'socket.io-client'
import type { StorageAdapter } from './storage'
import type { Attachment, CallMode, CallSignalData, Channel, Message, UserProfile, CallKeyPackage } from './types'
import type { ChatState } from './store/chat'
import type { UnreadState } from './store/unread'
import type { UsersState } from './store/users'
import type { ToastState } from './store/toasts'

// Polyfills for React Native
declare var global: any

if (typeof global.Buffer === 'undefined') {
  try {
    const { Buffer } = require('buffer')
    global.Buffer = Buffer
  } catch {}
}
if (typeof global.process === 'undefined') {
  global.process = { env: {} }
}
if (typeof global.WebSocket === 'undefined') {
  try {
    global.WebSocket = require('ws')
  } catch {
    try {
      global.WebSocket = require('react-native').WebSocket
    } catch {}
  }
}

type AckPayload = { status: string; message?: string; data?: unknown }

type StoreRefs = {
  chat: ChatState
  unread: UnreadState
  users: UsersState
  toasts: ToastState
}

let socket: Socket | null = null
let connected = false
let storeRefs: StoreRefs | null = null
let getTokenFn: (() => Promise<string | null>) | null = null
let backendUrl: string | null = null

export function initSocket(
  url: string,
  getToken: () => Promise<string | null>,
  refs: StoreRefs
) {
  backendUrl = url
  getTokenFn = getToken
  storeRefs = refs
}

function announceMessage(message: Message) {
  if (!storeRefs) return
  const { users, chat, toasts } = storeRefs
  const me = users.me
  const currentChannelId = chat.currentChannelId
  if (!shouldAnnounce(message, me?.id ?? null, currentChannelId)) return
  toasts.push({
    channelId: message.channelId,
    sender: message.username,
    preview: toastPreview(
      message.body,
      message.attachment ? attachmentKind(message.attachment.mime) : null,
    ),
  })
}

export async function connectSocket(): Promise<Socket | null> {
  if (connected) return socket
  if (!backendUrl || !getTokenFn) return null

  const token = await getTokenFn()
  if (!token) return null

  socket = io(backendUrl, { path: '/socket.io', auth: { token } })
  connected = true

  socket.on('newMessage', (payload) => {
    if (!storeRefs) return
    if (payload.channel) {
      storeRefs.chat.addChannel(payload.channel)
    }
    storeRefs.chat.addMessage(payload)
    announceMessage(payload)
  })
  socket.on('messageEdited', (message) => {
    storeRefs?.chat.updateMessage(message)
  })
  socket.on('messageDeleted', ({ messageId }) => {
    storeRefs?.chat.removeMessage(Number(messageId))
  })
  socket.on('messagePinned', ({ messageId, pinned }) => {
    storeRefs?.chat.setMessagePinned(Number(messageId), Boolean(pinned))
  })
  socket.on('messageReacted', (message) => {
    storeRefs?.chat.updateMessage(message)
  })
  socket.on('channelRead', ({ channelId, lastReadAt }) => {
    storeRefs?.unread.markChannelRead(Number(channelId), String(lastReadAt))
  })
  socket.on('newChannel', (channel) => {
    storeRefs?.chat.addChannel(channel)
  })
  socket.on('renameChannel', (channel) => {
    storeRefs?.chat.renameChannel(channel)
  })
  socket.on('removeChannel', ({ id }) => {
    storeRefs?.chat.removeChannel(Number(id))
  })
  socket.on('channelUpdated', (channel) => {
    storeRefs?.chat.updateChannel(channel)
  })
  socket.on('channelRemoved', ({ id }) => {
    storeRefs?.chat.removeChannel(Number(id))
  })

  socket.on('contactRequest', (payload) => {
    if (!storeRefs) return
    const { requestId, from, channel } = payload as {
      requestId: number
      from: UserProfile
      channel: Channel
    }
    storeRefs.users.addRequest({ id: requestId, from, channelId: channel.id })
    storeRefs.chat.addChannel(channel)
  })
  socket.on('contactRequestResolved', ({ requestId }) => {
    storeRefs?.users.removeRequest(Number(requestId))
  })
  socket.on('contactAdded', ({ profile }) => {
    storeRefs?.users.addContact(profile)
  })
  socket.on('contactRemoved', ({ userId }) => {
    storeRefs?.users.removeContact(Number(userId))
  })
  socket.on('userUpdated', (profile) => {
    storeRefs?.users.applyUserUpdate(profile)
  })
  socket.on('disconnect', () => {
    // Handled by callManager
  })
  socket.on('connect_error', (err) => {
    if (err.message === 'unauthorized') {
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

export type CreateGroupInput = {
  name: string
  description?: string
  avatarUrl?: string | null
  memberIds: number[]
}

export function emitCreateGroup(input: CreateGroupInput): Promise<Channel> {
  return emitWithAck<Channel>('createGroup', input)
}

export function emitEditGroup(
  channelId: number,
  input: Partial<{ name: string; description: string; avatarUrl: string | null }>,
): Promise<Channel> {
  return emitWithAck<Channel>('editGroup', { channelId, ...input })
}

export function emitRemoveGroup(channelId: number): Promise<void> {
  return emitWithAck<void>('removeGroup', { channelId })
}

export function emitInviteToGroup(channelId: number, memberIds: number[]): Promise<void> {
  return emitWithAck<void>('inviteToGroup', { channelId, memberIds })
}

export function emitKickFromGroup(channelId: number, userId: number): Promise<void> {
  return emitWithAck<void>('kickFromGroup', { channelId, userId })
}

export function emitSetGroupAdmin(
  channelId: number,
  userId: number,
  admin: boolean,
): Promise<void> {
  return emitWithAck<void>('setGroupAdmin', { channelId, userId, admin })
}

export function emitMuteGroupMember(
  channelId: number,
  userId: number,
  until: string,
): Promise<void> {
  return emitWithAck<void>('muteGroupMember', { channelId, userId, until })
}

export function emitUnmuteGroupMember(channelId: number, userId: number): Promise<void> {
  return emitWithAck<void>('unmuteGroupMember', { channelId, userId })
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

export function emitReadChannel(channelId: number): Promise<void> {
  const now = new Date().toISOString()
  storeRefs?.unread.markChannelRead(channelId, now)
  return emitWithAck<void>('readChannel', { channelId })
}

export function emitCallOffer(payload: {
  callId: string
  channelId: number
  mode: CallMode
  sdp: string
  keyPackage?: CallKeyPackage
}): Promise<{ outcome: 'ringing' | 'offline' | 'busy' }> {
  return emitWithAck<{ outcome: 'ringing' | 'offline' | 'busy' }>('callOffer', payload)
}

export function emitCallAnswer(callId: string, sdp: string, keyPackage?: CallKeyPackage): Promise<void> {
  return emitWithAck<void>('callAnswer', { callId, sdp, keyPackage })
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

// Toast utilities (copied from toasts store for socket to use without circular deps)
export function attachmentKind(mime: string | undefined): string {
  if (!mime) return 'Файл'
  if (mime === 'image/gif') return 'GIF'
  if (mime.startsWith('image/')) return 'Изображение'
  if (mime.startsWith('video/')) return 'Видео'
  if (mime.startsWith('audio/')) return 'Аудио'
  return 'Файл'
}

export function toastPreview(body: string, attachmentKind: string | null): string {
  const trimmed = body.trim()
  if (trimmed) {
    return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed
  }
  return attachmentKind ?? ''
}

export function shouldAnnounce(message: Message, meId: number | null, currentChannelId: number | null): boolean {
  if (meId === null) return false
  if (message.userId === meId) return false
  return message.channelId !== currentChannelId
}