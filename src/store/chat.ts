import { create } from 'zustand'
import type { Channel, Message } from '../types'

export type ChatState = {
  channels: Channel[]
  messages: Message[]
  currentChannelId: number | null
  error: string | null
  setInitialData: (channels: Channel[], messages: Message[], currentChannelId: number) => void
  setActiveChannel: (id: number) => void
  addMessage: (message: Message) => void
  addChannel: (channel: Channel) => void
  renameChannel: (channel: Channel) => void
  removeChannel: (id: number) => void
  setError: (message: string | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  channels: [],
  messages: [],
  currentChannelId: null,
  error: null,
  setInitialData: (channels, messages, currentChannelId) =>
    set({ channels, messages, currentChannelId, error: null }),
  setActiveChannel: (id) => set({ currentChannelId: id }),
  addMessage: (message) =>
    set((state) => ({
      messages: state.messages.some((m) => m.id === message.id)
        ? state.messages
        : [...state.messages, message],
    })),
  addChannel: (channel) =>
    set((state) => ({
      channels: state.channels.some((c) => c.id === channel.id)
        ? state.channels
        : [...state.channels, channel],
      currentChannelId: state.currentChannelId ?? channel.id,
    })),
  renameChannel: (channel) =>
    set((state) => ({
      channels: state.channels.map((c) => (c.id === channel.id ? channel : c)),
    })),
  removeChannel: (id) =>
    set((state) => {
      const channels = state.channels.filter((c) => c.id !== id)
      const messages = state.messages.filter((m) => m.channelId !== id)
      const currentChannelId =
        state.currentChannelId === id ? (channels[0]?.id ?? null) : state.currentChannelId
      return { channels, messages, currentChannelId }
    }),
  setError: (message) => set({ error: message }),
}))

export function selectActiveChannelMessages(state: ChatState): Message[] {
  return state.messages
    .filter((m) => m.channelId === state.currentChannelId)
    .sort((a, b) => a.id - b.id)
}