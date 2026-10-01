import { create } from 'zustand'
import type { Message, ReadState } from '../types'

export const UNREAD_CAP = 99

export type UnreadState = {
  firstSeenAt: string | null
  lastReadAtByChannel: Record<number, string>
  setReadState: (readState: ReadState | undefined) => void
  markChannelRead: (channelId: number, lastReadAt: string) => void
}

function toRecord(entries: ReadState['lastReadAtByChannel'] | undefined): Record<number, string> {
  return (entries ?? []).reduce<Record<number, string>>((acc, entry) => {
    acc[entry.channelId] = entry.lastReadAt
    return acc
  }, {})
}

export const useUnreadStore = create<UnreadState>((set) => ({
  firstSeenAt: null,
  lastReadAtByChannel: {},
  setReadState: (readState) =>
    set({
      firstSeenAt: readState?.firstSeenAt ?? null,
      lastReadAtByChannel: toRecord(readState?.lastReadAtByChannel),
    }),
  markChannelRead: (channelId, lastReadAt) =>
    set((state) => ({
      lastReadAtByChannel: { ...state.lastReadAtByChannel, [channelId]: lastReadAt },
    })),
}))

function toMillis(iso: string | null | undefined): number | null {
  if (!iso) return null
  const value = new Date(iso).getTime()
  return Number.isNaN(value) ? null : value
}

export function countUnread(
  firstSeenAt: string | null,
  lastReadAt: string | undefined,
  messages: Message[],
  channelId: number,
  myId: number | null,
): number {
  if (myId === null) return 0
  const baseline = Math.max(
    toMillis(firstSeenAt) ?? Number.NEGATIVE_INFINITY,
    toMillis(lastReadAt) ?? Number.NEGATIVE_INFINITY,
  )
  if (!Number.isFinite(baseline)) return 0

  let count = 0
  for (const message of messages) {
    if (message.channelId !== channelId) continue
    if (message.userId === myId) continue
    const at = toMillis(message.createdAt)
    if (at === null || at <= baseline) continue
    count += 1
  }
  return count
}

export type UnreadEntry = {
  count: number
  lastUnreadAt: number | null
}

export type UnreadIndex = Record<number, UnreadEntry>

export function buildUnreadIndex(
  messages: Message[],
  firstSeenAt: string | null,
  lastReadAtByChannel: Record<number, string>,
  myId: number | null,
): UnreadIndex {
  const index: UnreadIndex = {}
  if (myId === null) return index

  const firstSeen = toMillis(firstSeenAt) ?? Number.NEGATIVE_INFINITY
  const baselines = new Map<number, number>()
  for (const [key, value] of Object.entries(lastReadAtByChannel)) {
    const at = toMillis(value)
    if (at !== null) baselines.set(Number(key), at)
  }

  for (const message of messages) {
    if (message.userId === myId) continue
    const at = toMillis(message.createdAt)
    if (at === null) continue
    const baseline = Math.max(firstSeen, baselines.get(message.channelId) ?? Number.NEGATIVE_INFINITY)
    if (!Number.isFinite(baseline)) continue
    if (at <= baseline) continue

    const entry = index[message.channelId] ?? (index[message.channelId] = { count: 0, lastUnreadAt: null })
    entry.count += 1
    if (entry.lastUnreadAt === null || at > entry.lastUnreadAt) entry.lastUnreadAt = at
  }

  return index
}

export function unreadFor(index: UnreadIndex, channelId: number): number {
  return index[channelId]?.count ?? 0
}

export function compareByUnread(a: UnreadEntry, b: UnreadEntry): number {
  if (a.count !== b.count) return b.count - a.count
  if (a.lastUnreadAt === b.lastUnreadAt) return 0
  if (a.lastUnreadAt === null) return 1
  if (b.lastUnreadAt === null) return -1
  return a.lastUnreadAt - b.lastUnreadAt
}

export function sortByUnread<T extends { id: number }>(channels: T[], index: UnreadIndex): T[] {
  const empty: UnreadEntry = { count: 0, lastUnreadAt: null }
  return channels
    .map((channel, order) => ({ channel, order, entry: index[channel.id] ?? empty }))
    .sort((a, b) => compareByUnread(a.entry, b.entry) || a.order - b.order)
    .map((wrapped) => wrapped.channel)
}

export function formatUnread(count: number): string {
  return count > UNREAD_CAP ? `${UNREAD_CAP}+` : String(count)
}