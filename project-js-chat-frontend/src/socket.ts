import { io, type Socket } from 'socket.io-client'
import { BACKEND_URL } from './config'
import { useChatStore } from './store/chat'
import { useUnreadStore } from './store/unread'
import { useUsersStore } from './store/users'
import { useAuthStore } from './store/auth'
import { attachmentKind, shouldAnnounce, toastPreview, useToastStore } from './store/toasts'
import * as callManager from './callManager'
import { useGroupCallStore } from './store/groupCall'
import type { Attachment, CallMode, CallSignalData, Channel, Message, UserProfile, CallKeyPackage, GroupCallPeer, GroupCallPeerUpdatePayload, GroupCallPeerJoinedPayload, GroupCallPeerLeftPayload, GroupCallInvitePayload, GroupCallCreatedPayload, GroupCallEndedPayload, GroupCallKickedPayload } from './types'

type AckPayload = { status: string; message?: string; data?: unknown }

let socket: Socket | null = null
let connected = false

// A notice stands in for the conversation the reader is not looking at.
function announceMessage(message: Message) {
  const me = useUsersStore.getState().me
  const currentChannelId = useChatStore.getState().currentChannelId
  if (!shouldAnnounce(message, me?.id ?? null, currentChannelId)) return
  useToastStore.getState().push({
    channelId: message.channelId,
    sender: message.username,
    preview: toastPreview(
      message.body,
      message.attachment ? attachmentKind(message.attachment.mime) : null,
    ),
  })
}

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
    announceMessage(payload)
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
  // Another window of the same account read this channel; mirror the read point
  // so the badge clears here too.
  socket.on('channelRead', ({ channelId, lastReadAt }) => {
    useUnreadStore.getState().markChannelRead(Number(channelId), String(lastReadAt))
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
  socket.on('channelUpdated', (channel) => {
    useChatStore.getState().updateChannel(channel)
  })
  socket.on('channelRemoved', ({ id }) => {
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
  socket.on('groupCallCreated', (payload: GroupCallCreatedPayload) => {
    const me = useUsersStore.getState().me
    useGroupCallStore.getState().upsertActiveCall({
      callId: payload.callId,
      channelId: payload.channelId,
      mode: payload.mode,
      creatorId: me?.id ?? 0,
      participants: me ? [me.id] : [],
      createdAt: new Date().toISOString(),
    })
  })
  socket.on('groupCallInvite', (payload: GroupCallInvitePayload) => {
    useGroupCallStore.getState().upsertActiveCall({
      callId: payload.callId,
      channelId: payload.channelId,
      mode: payload.mode,
      creatorId: payload.creator.id,
      participants: [payload.creator.id],
      createdAt: new Date().toISOString(),
    })
    useToastStore.getState().push({
      channelId: payload.channelId,
      sender: payload.creator.username,
      preview: `Приглашает в ${payload.mode === 'video' ? 'видеочат' : 'голосовой чат'}`,
    })
  })
  socket.on('groupCallPeerJoined', (payload: GroupCallPeerJoinedPayload) => {
    const peerId = String(payload.peer.id)
    useGroupCallStore.getState().addParticipant({
      userId: peerId,
      displayName: payload.peer.username,
      avatarUrl: payload.peer.avatarUrl,
      role: 'participant',
      isMuted: false,
      isCameraOn: false,
      isScreenSharing: false,
      isSpeaking: false,
      audioLevel: 0,
      joinedAt: new Date(),
    })
    const state = useGroupCallStore.getState().state
    if (state) {
      useGroupCallStore.getState().upsertActiveCall({
        callId: state.callId,
        channelId: state.channelId,
        mode: state.mode,
        creatorId: Number(state.creatorId) || 0,
        participants: Array.from(state.participants.keys()).map(Number),
        createdAt: state.createdAt.toISOString(),
      })
    }
  })
  socket.on('groupCallPeerLeft', (payload: GroupCallPeerLeftPayload) => {
    useGroupCallStore.getState().removeParticipant(String(payload.peerId))
  })
  socket.on('groupCallPeerUpdate', (payload: GroupCallPeerUpdatePayload) => {
    const updates = payload.updates ?? {}
    useGroupCallStore.getState().updateParticipant(String(payload.peerId), {
      ...(typeof updates.isMuted === 'boolean' ? { isMuted: updates.isMuted } : {}),
      ...(typeof updates.isCameraOn === 'boolean' ? { isCameraOn: updates.isCameraOn } : {}),
      ...(typeof updates.isScreenSharing === 'boolean' ? { isScreenSharing: updates.isScreenSharing } : {}),
      ...(typeof updates.isSpeaking === 'boolean' ? { isSpeaking: updates.isSpeaking } : {}),
      ...(typeof updates.audioLevel === 'number' ? { audioLevel: updates.audioLevel } : {}),
    })
  })
  socket.on('groupCallEnded', (payload: GroupCallEndedPayload) => {
    useGroupCallStore.getState().removeActiveCall(payload.callId)
    const current = useGroupCallStore.getState().state
    if (current?.callId === payload.callId) {
      useGroupCallStore.getState().reset()
    }
    window.dispatchEvent(new CustomEvent('group-call-ended', { detail: payload }))
  })
  socket.on('groupCallKicked', (payload: GroupCallKickedPayload) => {
    window.dispatchEvent(new CustomEvent('group-call-kicked', { detail: payload }))
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
  socket.on('disconnect', () => {
    callManager.onSocketClosed()
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
  // Optimistic: the reader's own badge should disappear on the click, not after
  // a round trip. The server echo confirms the point for other sessions.
  const now = new Date().toISOString()
  useUnreadStore.getState().markChannelRead(channelId, now)
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

// Group call functions
export function emitGroupCallCreate(payload: {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
}): Promise<void> {
  return emitWithAck<void>('groupCallCreate', payload)
}

export function emitGroupCallJoin(payload: {
  callId: string
  userId: string
  rtpCapabilities: any
}): Promise<void> {
  return emitWithAck<void>('groupCallJoin', payload)
}

export function emitGroupCallLeave(payload: {
  callId: string
  userId: string
}): Promise<void> {
  return emitWithAck<void>('groupCallLeave', payload)
}

export function emitGroupCallSignal(payload: {
  callId: string
  targetUserId: string
  signal: any
}): Promise<void> {
  return emitWithAck<void>('groupCallSignal', payload)
}

export function emitGroupCallProduce(payload: {
  callId: string
  kind: 'audio' | 'video'
  rtpParameters: any
  appData: any
}): Promise<void> {
  return emitWithAck<void>('groupCallProduce', payload)
}

export function emitGroupCallConsume(payload: {
  callId: string
  producerId: string
  rtpCapabilities: any
}): Promise<void> {
  return emitWithAck<void>('groupCallConsume', payload)
}

export function emitGroupCallMLSMessage(payload: {
  callId: string
  message: any
}): Promise<void> {
  return emitWithAck<void>('groupCallMLSMessage', payload)
}

export function emitGroupCallPeerUpdate(payload: {
  callId: string
  userId: string
  updates: Partial<GroupCallPeer>
}): Promise<void> {
  return emitWithAck<void>('groupCallPeerUpdate', payload)
}

export function emitGroupCallKick(callId: string, targetUserId: string): Promise<void> {
  return emitWithAck<void>('groupCallKick', { callId, targetUserId })
}
