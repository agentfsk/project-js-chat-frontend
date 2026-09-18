import { apiRequest } from './client'
import type { Channel, Message } from '../types'

export type DataResponse = {
  channels: Channel[]
  currentChannelId: number
  messages: Message[]
}

export function fetchData(): Promise<DataResponse> {
  return apiRequest<DataResponse>('/api/v1/data')
}