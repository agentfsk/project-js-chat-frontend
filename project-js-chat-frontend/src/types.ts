export type ChannelKind = 'public' | 'direct' | 'group'

export type ChannelMuteEntry = {
  userId: number
  mutedUntil: string
}

export type Channel = {
  id: number
  name: string
  removable: boolean
  private?: boolean
  participants?: number[]
  kind?: ChannelKind
  description?: string
  avatarUrl?: string | null
  ownerId?: number
  admins?: number[]
  muted?: ChannelMuteEntry[]
  members?: UserProfile[]
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

export type OutgoingContactRequest = {
  id: number
  to: UserProfile
  channelId: number
  status: 'pending' | 'accepted' | 'declined'
}

export type Attachment = {
  name: string
  mime: string
  size: number
  url: string
  width?: number
  height?: number
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
  createdAt?: string
  edited: boolean
  pinned: boolean
  attachment?: Attachment
  reactions?: MessageReaction[]
  replyTo?: MessageReplyTo
}

export type ChannelReadEntry = {
  channelId: number
  lastReadAt: string
}

export type ReadState = {
  firstSeenAt: string
  lastReadAtByChannel: ChannelReadEntry[]
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

export type CallKeyPackage = {
  identityKey: string
  signedPreKey: {
    keyId: number
    publicKey: string
    signature: string
  }
  oneTimePreKey?: {
    keyId: number
    publicKey: string
  }
  ephemeralKey: string
}

export type E2EEContext = {
  encryptor: any
  decryptor: any
  ratchet: any
  safetyNumber: bigint
  keyId: number
  localKeyPackage: CallKeyPackage
  remoteKeyPackage: CallKeyPackage | null
}

export type PreKeyBundle = {
  identityKey: string
  signedPreKey: {
    keyId: number
    publicKey: string
    signature: string
  }
  oneTimePreKey?: {
    keyId: number
    publicKey: string
  }
}

export type GroupCallCreatedPayload = {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  rtpCapabilities?: any
  iceServers?: RTCIceServer[]
}

export type GroupCallInvitePayload = {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  creator: UserProfile
}

export type GroupCallPeerJoinedPayload = {
  callId: string
  peer: UserProfile
}

export type GroupCallPeerLeftPayload = {
  callId: string
  peerId: number
}

export type GroupCallSignalPayload = {
  callId: string
  fromUserId: number
  signal: any
}

export type GroupCallMLSMessagePayload = {
  callId: string
  fromUserId: string | number
  message: any
}

export type GroupCallNewProducerPayload = {
  callId: string
  producerId: string
  kind: 'audio' | 'video'
  producerUserId: string | number
  appData?: Record<string, unknown>
}

export type GroupCallPeerUpdatePayload = {
  callId: string
  peerId: string | number
  joined?: boolean
  updates?: Partial<GroupCallPeer>
}

export type GroupCallEndedPayload = {
  callId: string
  channelId: number
  reason: string
}

export type GroupCallKickedPayload = {
  callId: string
}

export type GroupCallPeer = {
  userId: string | number
  displayName?: string
  avatarUrl?: string | null
  role?: string
  isMuted?: boolean
  isCameraOn?: boolean
  isScreenSharing?: boolean
  isSpeaking?: boolean
  audioLevel?: number
  joinedAt?: string
  sframeKeyId?: number
}

export type ActiveGroupCall = {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  creatorId: number
  participants: number[]
  createdAt: string
}
