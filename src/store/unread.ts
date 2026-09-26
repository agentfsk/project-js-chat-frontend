import { useMemo } from 'react'
import { create } from 'zustand'
import { useChatStore } from './chat'
import type { Message, ReadState } from '../types'

export const UNREAD_CAP = 99

export type UnreadState = {
  // When the reader first loaded chat data. Messages older than this were never
  // missed by them, so they never count as unread.
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
  // A backend that does not report read state leaves firstSeenAt null, which the
  // selectors read as "no unread information" rather than "everything unread".
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

// The baseline is the later of "first time this reader ever loaded" and "last
// time this reader read the channel", so history predating the reader never
// counts and a read always wins over the initial baseline.
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

export function formatUnread(count: number): string {
  return count > UNREAD_CAP ? `${UNREAD_CAP}+` : String(count)
}

export function useChannelUnread(channelId: number, myId: number | null): number {
  const firstSeenAt = useUnreadStore((state) => state.firstSeenAt)
  const lastReadAt = useUnreadStore((state) => state.lastReadAtByChannel[channelId])
  const messages = useChatStore((state) => state.messages)
  return useMemo(
    () => countUnread(firstSeenAt, lastReadAt, messages, channelId, myId),
    [firstSeenAt, lastReadAt, messages, channelId, myId],
  )
}
