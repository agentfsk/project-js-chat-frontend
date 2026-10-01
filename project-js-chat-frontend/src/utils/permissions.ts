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

function isGroupMemberOf(channel: Channel, userId: number): boolean {
  return Boolean(channel.participants?.includes(userId))
}

function isAdminTarget(channel: Channel, targetId: number): boolean {
  return Boolean(channel.admins?.includes(targetId))
}

// Muting and voice restoration: the owner reaches any other member, an admin
// only a plain one, and nobody reaches the owner.
export function canMuteGroupMember(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  if (!user || !isGroupChannel(channel)) return false
  if (!isGroupMemberOf(channel, targetId)) return false
  if (channel.ownerId === targetId) return false
  if (isGroupOwner(channel, user)) return true
  if (isGroupAdmin(channel, user)) return !isAdminTarget(channel, targetId)
  return false
}

// Role changes and removal are the owner's alone, over any other member. The
// membership check mirrors the server's own guard so the menu never offers an
// action the socket would refuse.
export function canSetGroupAdmin(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  return Boolean(isGroupOwner(channel, user)
    && isGroupMemberOf(channel, targetId)
    && targetId !== channel.ownerId)
}

export function canDemoteGroupMember(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  return Boolean(isGroupOwner(channel, user)
    && isGroupMemberOf(channel, targetId)
    && targetId !== channel.ownerId
    && isAdminTarget(channel, targetId))
}

export function canKickFromGroup(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  return Boolean(isGroupOwner(channel, user)
    && isGroupMemberOf(channel, targetId)
    && targetId !== channel.ownerId)
}

// Whether a moderation menu may be opened on the target at all: some action is
// available on it. Admins get no menu on other admins or the owner; plain
// members get no menu anywhere.
export function canActOnGroupMember(channel: Channel, user: UserProfile | null, targetId: number): boolean {
  if (!isGroupChannel(channel)) return false
  if (isGroupOwner(channel, user)) {
    return isGroupMemberOf(channel, targetId) && targetId !== channel.ownerId
  }
  return canMuteGroupMember(channel, user, targetId)
}
