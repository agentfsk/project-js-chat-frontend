import type { Channel, Message, UserProfile } from '../types'
import { isGroupChannel } from './channelKind'

export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === 'admin'
}

export function canEditMessage(message: Message, user: UserProfile | null): boolean {
  if (!user) return false
  return isAdmin(user) || message.userId === user.id
}

export function canDeleteMessage(message: Message, user: UserProfile | null): boolean {
  return canEditMessage(message, user)
}

export function canPinMessage(channel: Channel, user: UserProfile | null): boolean {
  if (!user) return false
  if (isGroupChannel(channel)) return false
  return isAdmin(user) || Boolean(channel.private)
}

export function isGroupOwner(channel: Channel, user: UserProfile | null): boolean {
  return Boolean(user && isGroupChannel(channel) && channel.ownerId === user.id)
}

export function isGroupAdmin(channel: Channel, user: UserProfile | null): boolean {
  return Boolean(user && isGroupChannel(channel) && channel.admins?.includes(user.id))
}

export function canModerateGroup(channel: Channel, user: UserProfile | null): boolean {
  return isGroupOwner(channel, user) || isGroupAdmin(channel, user)
}

// A target is "mutable" when the viewer may open a moderation menu on it: the
// viewer moderates the group and the target is a plain member.
export function canMuteGroupMember(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  if (!user || !isGroupChannel(channel)) return false
  if (!canModerateGroup(channel, user)) return false
  return isModeratableTarget(channel, targetId)
}

export function canSetGroupAdmin(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  return Boolean(isGroupOwner(channel, user) && targetId !== channel.ownerId)
}

export function canKickFromGroup(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  return Boolean(isGroupOwner(channel, user) && targetId !== channel.ownerId)
}

// Whether a moderation menu may be opened on the target at all: the viewer
// moderates the group and the target is a plain member. Admins get no menu on
// other admins or the owner; plain members get no menu anywhere.
export function canActOnGroupMember(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  return Boolean(isGroupChannel(channel) && canModerateGroup(channel, user) && isModeratableTarget(channel, targetId))
}

function isModeratableTarget(channel: Channel, targetId: number): boolean {
  if (!channel.participants?.includes(targetId)) return false
  if (channel.ownerId === targetId) return false
  if (channel.admins?.includes(targetId)) return false
  return true
}