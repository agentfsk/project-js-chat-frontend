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
}

export type SafetyNumber = {
  fingerprint: bigint
  formatted: string
  qrData: string
  verified: boolean
}

export type GroupCallMode = 'audio' | 'video'

export type GroupCallPhase = 'idle' | 'connecting' | 'joined' | 'leaving' | 'ended'

export type GroupCallRole = 'creator' | 'admin' | 'participant'

export type GroupCallParticipant = {
  userId: string
  displayName: string
  avatarUrl: string | null
  role: GroupCallRole
  isMuted: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
  audioLevel: number
  joinedAt: Date
  sframeKeyId?: number
}

export type GroupCallPeer = {
  userId: string
  socketId: string
  displayName: string
  avatarUrl: string | null
  role: GroupCallRole
  isMuted: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
  audioLevel: number
  joinedAt: Date
  sframeKeyId: number
}

export interface GroupCallState {
  callId: string
  channelId: number
  mode: GroupCallMode
  phase: GroupCallPhase
  creatorId: string
  participants: Map<string, GroupCallParticipant>
  localParticipant: GroupCallParticipant | null
  createdAt: Date
  startedAt: Date | null
  endedAt: Date | null
  sframeKeys: Map<number, SFrameKey>
  localKeyId: number
}

export type GroupCallCreatedPayload = {
  callId: string
  channelId: number
  mode: GroupCallMode
}

export type GroupCallInvitePayload = {
  callId: string
  channelId: number
  mode: GroupCallMode
  creator: UserProfile
}

export type GroupCallPeerJoinedPayload = {
  callId: string
  peer: GroupCallPeer
}

export type GroupCallPeerLeftPayload = {
  callId: string
  peerId: string
}

export type GroupCallSignalPayload = {
  callId: string
  targetUserId: string
  signal: any
}

export type GroupCallMLSMessagePayload = {
  callId: string
  fromUserId: string
  message: any
}

export type GroupCallNewProducerPayload = {
  callId: string
  producerId: string
  kind: 'audio' | 'video'
  producerUserId: string
}

export type GroupCallPeerUpdatePayload = {
  callId: string
  peerId: string
  updates: Partial<GroupCallPeer>
}

export type GroupCallProducePayload = {
  callId: string
  kind: 'audio' | 'video'
  rtpParameters: any
  appData: any
}

export type GroupCallConsumePayload = {
  callId: string
  producerId: string
  rtpCapabilities: any
}

export type SFrameKey = {
  keyId: number
  key: Uint8Array
  salt: Uint8Array
}