import type { GroupCallMode } from './types'

const STORAGE_KEY = 'group-call-persistence-v1'

export interface PersistedGroupCall {
  callId: string
  channelId: number
  mode: GroupCallMode
  groupId?: string
  epoch?: number
  localKeyId?: number
  savedAt: string
}

type PersistedState = Record<string, PersistedGroupCall>

function readAll(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable (private mode, quota) - persistence is best effort.
  }
}

export function saveGroupCallState(call: PersistedGroupCall): void {
  const state = readAll()
  state[call.callId] = { ...call, savedAt: new Date().toISOString() }
  writeAll(state)
}

export function loadGroupCallState(callId: string): PersistedGroupCall | null {
  return readAll()[callId] ?? null
}

export function loadLastGroupCallForChannel(channelId: number): PersistedGroupCall | null {
  const calls = Object.values(readAll()).filter((call) => call.channelId === channelId)
  if (calls.length === 0) return null
  calls.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  return calls[0]
}

export function clearGroupCallState(callId: string): void {
  const state = readAll()
  delete state[callId]
  writeAll(state)
}
