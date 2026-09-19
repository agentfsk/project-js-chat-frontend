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

export type Message = {
  id: number
  body: string
  channelId: number
  username: string
  attachment?: Attachment
}