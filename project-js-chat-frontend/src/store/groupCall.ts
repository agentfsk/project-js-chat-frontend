import { create } from 'zustand'
import type { GroupCallState, GroupCallParticipant, GroupCallPhase } from '../groupCall/types'
import type { ActiveGroupCall } from '../types'

interface GroupCallStore {
  state: GroupCallState | null
  activeCalls: Map<number, ActiveGroupCall>
  initialize: (initialState: Omit<GroupCallState, 'participants'> & { participants?: GroupCallParticipant[] }) => void
  reset: () => void
  setPhase: (phase: GroupCallPhase) => void
  addParticipant: (participant: GroupCallParticipant) => void
  removeParticipant: (userId: string) => void
  updateParticipant: (userId: string, updates: Partial<GroupCallParticipant>) => void
  setActiveCalls: (calls: ActiveGroupCall[]) => void
  upsertActiveCall: (call: ActiveGroupCall) => void
  removeActiveCall: (callId: string) => void
}

export const useGroupCallStore = create<GroupCallStore>((set, get) => ({
  state: null,
  activeCalls: new Map(),

  initialize: (initialState) => {
    const participants = new Map<string, GroupCallParticipant>()
    initialState.participants?.forEach((p) => {
      participants.set(p.userId, p)
    })

    const state: GroupCallState = {
      ...initialState,
      participants,
      localParticipant: initialState.localParticipant ?? null,
      sframeKeys: initialState.sframeKeys || new Map(),
      localKeyId: initialState.localKeyId ?? 0,
    }

    set({ state })
  },

  reset: () => {
    set({ state: null })
  },

  setPhase: (phase: GroupCallPhase) => {
    const state = get().state
    if (!state) return

    set({
      state: {
        ...state,
        phase,
        startedAt: phase === 'joined' ? new Date() : state.startedAt,
        endedAt: phase === 'ended' ? new Date() : state.endedAt,
      },
    })
  },

  addParticipant: (participant: GroupCallParticipant) => {
    const state = get().state
    if (!state) return

    const participants = new Map(state.participants)
    participants.set(participant.userId, participant)

    set({
      state: { ...state, participants },
    })
  },

  removeParticipant: (userId: string) => {
    const state = get().state
    if (!state) return

    const participants = new Map(state.participants)
    participants.delete(userId)

    const localParticipant = state.localParticipant?.userId === userId ? null : state.localParticipant

    set({
      state: { ...state, participants, localParticipant },
    })
  },

  updateParticipant: (userId: string, updates: Partial<GroupCallParticipant>) => {
    const state = get().state
    if (!state) return

    const participant = state.participants.get(userId)
    if (!participant) return

    const participants = new Map(state.participants)
    participants.set(userId, { ...participant, ...updates })

    const localParticipant = state.localParticipant?.userId === userId
      ? { ...state.localParticipant, ...updates }
      : state.localParticipant

    set({
      state: { ...state, participants, localParticipant },
    })
  },

  setActiveCalls: (calls: ActiveGroupCall[]) => {
    const activeCalls = new Map<number, ActiveGroupCall>()
    calls.forEach((call) => {
      activeCalls.set(call.channelId, call)
    })
    set({ activeCalls })
  },

  upsertActiveCall: (call: ActiveGroupCall) => {
    const activeCalls = new Map(get().activeCalls)
    activeCalls.set(call.channelId, call)
    set({ activeCalls })
  },

  removeActiveCall: (callId: string) => {
    const activeCalls = new Map(get().activeCalls)
    for (const [channelId, call] of activeCalls) {
      if (call.callId === callId) {
        activeCalls.delete(channelId)
      }
    }
    set({ activeCalls })
  },
}))
