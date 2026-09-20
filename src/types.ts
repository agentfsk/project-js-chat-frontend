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