import type { Channel, ChannelKind } from '../types'

// Mirrors the backend's kind fallback so legacy channels without a `kind` sort
// correctly: a `private` flag means a direct chat, anything else is public.
export function channelKind(channel: Channel): ChannelKind {
  return channel.kind ?? (channel.private ? 'direct' : 'public')
}

export function isGroupChannel(channel: Channel): boolean {
  return channelKind(channel) === 'group'
}

export function isDirectChannel(channel: Channel): boolean {
  return channelKind(channel) === 'direct'
}

export function isPrivateConversation(channel: Channel): boolean {
  return channelKind(channel) !== 'public'
}