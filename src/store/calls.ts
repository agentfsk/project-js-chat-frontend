import { create } from 'zustand'
import type { CallIncomingPayload, CallMode, CallPhase, UserProfile } from '../types'

type Direction = 'outgoing' | 'incoming'

export type CallState = {
  phase: CallPhase
  direction: Direction | null
  mode: CallMode
  channelId: number | null
  callId: string | null
  peer: UserProfile | null
  micOn: boolean
  camOn: boolean
  screenOn: boolean
  error: string | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  beginOutgoing: (params: {
    callId: string
    channelId: number
    mode: CallMode
    peer: UserProfile
  }) => void
  beginIncoming: (payload: CallIncomingPayload) => void
  activate: () => void
  setStreams: (streams: { localStream: MediaStream | null; remoteStream: MediaStream | null }) => void
  setMic: (on: boolean) => void
  setCam: (on: boolean) => void
  setScreen: (on: boolean) => void
  end: (error?: string) => void
  clear: () => void
}

const initial = {
  phase: 'idle' as CallPhase,
  direction: null as Direction | null,
  mode: 'audio' as CallMode,
  channelId: null,
  callId: null,
  peer: null,
  micOn: true,
  camOn: false,
  screenOn: false,
  error: null,
  localStream: null,
  remoteStream: null,
}

export const useCallStore = create<CallState>((set) => ({
  ...initial,
  beginOutgoing: ({ callId, channelId, mode, peer }) =>
    set({
      ...initial,
      phase: 'calling',
      direction: 'outgoing',
      mode,
      callId,
      channelId,
      peer,
      micOn: true,
      camOn: mode === 'video',
    }),
  beginIncoming: (payload) =>
    set({
      ...initial,
      phase: 'ringing',
      direction: 'incoming',
      mode: payload.mode,
      callId: payload.callId,
      channelId: payload.channelId,
      peer: payload.peer,
      micOn: true,
      camOn: payload.mode === 'video',
    }),
  activate: () => set({ phase: 'active', error: null }),
  setStreams: ({ localStream, remoteStream }) => set({ localStream, remoteStream }),
  setMic: (on) => set({ micOn: on }),
  setCam: (on) => set({ camOn: on }),
  setScreen: (on) => set({ screenOn: on }),
  end: (error) => set({ phase: 'ended', error: error ?? null }),
  clear: () => set({ ...initial }),
}))