export type Channel = {
  id: number
  name: string
  removable: boolean
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