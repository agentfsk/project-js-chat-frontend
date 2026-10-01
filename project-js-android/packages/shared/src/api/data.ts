import type { Channel, ContactRequest, Message, OutgoingContactRequest, ReadState, UserProfile } from '../types'

export type DataResponse = {
  channels: Channel[]
  currentChannelId: number
  messages: Message[]
  me: UserProfile
  contacts: UserProfile[]
  requests: ContactRequest[]
  outgoingRequests: OutgoingContactRequest[]
  readState?: ReadState
}

export function createDataApi(apiRequest: (path: string, options?: RequestInit) => Promise<any>) {
  return {
    fetchData: (): Promise<DataResponse> => apiRequest('/api/v1/data'),
  }
}