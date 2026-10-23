import { create } from 'zustand'
import type { GroupCallState, GroupCallParticipant, GroupCallPhase, GroupCallMode } from '../groupCall/types'

interface GroupCallStore {
  state: GroupCallState | null
  initialize: (initialState: Omit<GroupCallState, 'participants'> & { participants?: GroupCallParticipant[] }) => void
  reset: () => void
  setPhase: (phase: GroupCallPhase) => void
  addParticipant: (participant: GroupCallParticipant) => void
  removeParticipant: (userId: string) => void
  updateParticipant: (userId: string, updates: Partial<GroupCallParticipant>) => void
}

const initialState: GroupCallState = {
  callId: '',
  channelId: 0,
  mode: 'audio',
  phase: 'idle',
  creatorId: '',
  participants: new Map(),
  localParticipant: null,
  createdAt: new Date(),
  startedAt: null,
  endedAt: null,
  sframeKeys: new Map(),
  localKeyId: 0,
}

export const useGroupCallStore = create<GroupCallStore>((set, get) => ({
  state: null,

  initialize: (initialState) => {
    const participants = new Map<string, GroupCallParticipant>()
    initialState.participants?.forEach((p) => {
      participants.set(p.userId, p)
    })

    const state: GroupCallState = {
      ...initialState,
      participants,
      localParticipant: participants.get(initialState.creatorId) || null,
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
}))