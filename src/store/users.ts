import { create } from 'zustand'
import type { ContactRequest, OutgoingContactRequest, UserProfile } from '../types'
import { useChatStore } from './chat'
import { useAuthStore } from './auth'

type UsersState = {
  me: UserProfile | null
  contacts: UserProfile[]
  requests: ContactRequest[]
  outgoingRequests: OutgoingContactRequest[]
  profiles: Record<number, UserProfile>
  setInitialData: (
    me: UserProfile,
    contacts: UserProfile[],
    requests: ContactRequest[],
    outgoingRequests: OutgoingContactRequest[],
  ) => void
  upsertProfiles: (profiles: UserProfile[]) => void
  addRequest: (request: ContactRequest) => void
  removeRequest: (requestId: number) => void
  addContact: (profile: UserProfile) => void
  removeContact: (userId: number) => void
  applyUserUpdate: (profile: UserProfile) => void
}

export const useUsersStore = create<UsersState>((set, get) => ({
  me: null,
  contacts: [],
  requests: [],
  outgoingRequests: [],
  profiles: {},
  setInitialData: (me, contacts, requests, outgoingRequests) => {
    const peerProfiles = [
      ...requests.map((request) => request.from),
      ...outgoingRequests.map((request) => request.to),
    ]
    const profiles = [me, ...contacts, ...peerProfiles].reduce<Record<number, UserProfile>>(
      (acc, profile) => {
        acc[profile.id] = profile
        return acc
      },
      {},
    )
    set({ me, contacts, requests, outgoingRequests, profiles })
  },
  upsertProfiles: (list) =>
    set((state) => ({
      profiles: list.reduce<Record<number, UserProfile>>(
        (acc, profile) => ({ ...acc, [profile.id]: profile }),
        state.profiles,
      ),
    })),
  addRequest: (request) =>
    set((state) => ({
      requests: state.requests.some((r) => r.id === request.id)
        ? state.requests
        : [...state.requests, request],
      profiles: { ...state.profiles, [request.from.id]: request.from },
    })),
  removeRequest: (requestId) =>
    set((state) => ({ requests: state.requests.filter((r) => r.id !== requestId) })),
  addContact: (profile) =>
    set((state) => ({
      contacts: state.contacts.some((c) => c.id === profile.id)
        ? state.contacts
        : [...state.contacts, profile],
      profiles: { ...state.profiles, [profile.id]: profile },
      requests: state.requests.filter((r) => r.from.id !== profile.id),
    })),
  removeContact: (userId) =>
    set((state) => ({ contacts: state.contacts.filter((c) => c.id !== userId) })),
  applyUserUpdate: (profile) => {
    const { me, profiles, contacts } = get()
    const prev = profiles[profile.id]?.username
    if (prev && prev !== profile.username) {
      useChatStore.getState().renameUser(prev, profile.username)
    }
    if (me?.id === profile.id) {
      useAuthStore.getState().setUsername(profile.username)
    }
    set({
      me: me?.id === profile.id ? profile : me,
      profiles: { ...profiles, [profile.id]: profile },
      contacts: contacts.map((c) => (c.id === profile.id ? profile : c)),
    })
  },
}))