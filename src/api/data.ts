import { apiRequest } from './client'
import type { Channel, ContactRequest, Message, UserProfile } from '../types'

export type DataResponse = {
  channels: Channel[]
  currentChannelId: number
  messages: Message[]
  me: UserProfile
  contacts: UserProfile[]
  requests: ContactRequest[]
}

export function fetchData(): Promise<DataResponse> {
  return apiRequest<DataResponse>('/api/v1/data')
}