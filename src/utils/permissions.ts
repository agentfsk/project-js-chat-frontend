import type { Channel, Message, UserProfile } from '../types'

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
  return isAdmin(user) || Boolean(channel.private)
}