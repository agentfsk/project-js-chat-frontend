import { create } from 'zustand'
import type { CallIncomingPayload, CallMode, CallPhase, UserProfile, CallKeyPackage } from '../types'

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
  remoteVideo: boolean
  safetyNumber: bigint | null
  localKeyPackage: CallKeyPackage | null
  remoteKeyPackage: CallKeyPackage | null
  beginOutgoing: (params: {
    callId: string
    channelId: number
    mode: CallMode
    peer: UserProfile
    localKeyPackage?: CallKeyPackage
  }) => void
  beginIncoming: (payload: CallIncomingPayload & { keyPackage?: CallKeyPackage }) => void
  activate: () => void
  setStreams: (streams: { localStream: MediaStream | null; remoteStream: MediaStream | null }) => void
  setMic: (on: boolean) => void
  setCam: (on: boolean) => void
  setScreen: (on: boolean) => void
  setRemoteVideo: (on: boolean) => void
  setSafetyNumber: (safetyNumber: bigint | null) => void
  end: (error?: string) => void
  setError: (error: string | null) => void
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
  remoteVideo: false,
  safetyNumber: null as bigint | null,
  localKeyPackage: null as CallKeyPackage | null,
  remoteKeyPackage: null as CallKeyPackage | null,
}

export const useCallStore = create<CallState>((set) => ({
  ...initial,
  beginOutgoing: ({ callId, channelId, mode, peer, localKeyPackage }) =>
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
      localKeyPackage: localKeyPackage ?? null,
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
      remoteKeyPackage: payload.keyPackage ?? null,
    }),
  activate: () => set({ phase: 'active', error: null }),
  setStreams: ({ localStream, remoteStream }) => set({ localStream, remoteStream }),
  setMic: (on) => set({ micOn: on }),
  setCam: (on) => set({ camOn: on }),
  setScreen: (on) => set({ screenOn: on }),
  setRemoteVideo: (on) => set({ remoteVideo: on }),
  setSafetyNumber: (safetyNumber) => set({ safetyNumber }),
  end: (error) => set({ phase: 'ended', error: error ?? null }),
  setError: (error) => set({ error }),
  clear: () => set({ ...initial }),
}))