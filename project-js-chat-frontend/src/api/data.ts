import { apiRequest } from './client'
import type { ActiveGroupCall, Channel, ContactRequest, Message, OutgoingContactRequest, ReadState, UserProfile } from '../types'

export type DataResponse = {
  channels: Channel[]
  currentChannelId: number
  messages: Message[]
  me: UserProfile
  contacts: UserProfile[]
  requests: ContactRequest[]
  outgoingRequests: OutgoingContactRequest[]
  readState?: ReadState
  groupCalls?: ActiveGroupCall[]
}

export function fetchData(): Promise<DataResponse> {
  return apiRequest<DataResponse>('/api/v1/data')
}