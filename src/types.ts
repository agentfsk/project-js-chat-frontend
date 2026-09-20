export type Channel = {
  id: number
  name: string
  removable: boolean
  private?: boolean
  participants?: number[]
}

export type UserProfile = {
  id: number
  username: string
  avatarUrl: string | null
  role?: 'admin' | 'user'
}

export type ContactRequest = {
  id: number
  from: UserProfile
  channelId: number
}

export type Attachment = {
  name: string
  mime: string
  size: number
  url: string
}

export type MessageReaction = {
  userId: number
  emoji: string
}

export type MessageReplyTo = {
  id: number
  body: string
  username: string
  userId: number
  attachment?: Attachment
}

export type Message = {
  id: number
  body: string
  channelId: number
  username: string
  userId: number
  edited: boolean
  pinned: boolean
  attachment?: Attachment
  reactions?: MessageReaction[]
  replyTo?: MessageReplyTo
}

export type CallMode = 'audio' | 'video'

export type CallPhase = 'idle' | 'calling' | 'ringing' | 'active' | 'ended'

export type CallSignalData =
  | { type: 'ice'; candidate: RTCIceCandidateInit | null }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }

export type CallOfferOutcome = 'ringing' | 'offline' | 'busy'

export type CallIncomingPayload = {
  callId: string
  channelId: number
  mode: CallMode
  peer: UserProfile
  sdp: string
}

export type CallAnsweredPayload = {
  callId: string
  sdp: string
}

export type CallSignalPayload = {
  callId: string
  data: CallSignalData
}

export type CallEndedPayload = {
  callId: string
  reason: string
}

export type CallRejectedPayload = {
  callId: string
}

export type CallActivePayload = {
  callId: string
}