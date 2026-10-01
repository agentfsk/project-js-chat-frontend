import type { Channel, ChannelKind } from '../types'

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