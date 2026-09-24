import type {
  CallActivePayload,
  CallAnsweredPayload,
  CallEndedPayload,
  CallIncomingPayload,
  CallMode,
  CallRejectedPayload,
  CallSignalData,
  CallSignalPayload,
  UserProfile,
} from './types'
import { useCallStore } from './store/calls'
import { CallEngine } from './webrtc'
import {
  emitCallAnswer,
  emitCallHangup,
  emitCallOffer,
  emitCallReject,
  emitCallSignal,
} from './socket'

const RING_TIMEOUT_MS = 30_000
const ENDED_DISMISS_MS = 4_000

let engine: CallEngine | null = null
let pendingOfferSdp: string | null = null
let pendingSignals: CallSignalData[] = []
let ringTimeout: ReturnType<typeof setTimeout> | null = null
let clearTimeoutHandle: ReturnType<typeof setTimeout> | null = null

function cancelRingTimeout(): void {
  if (ringTimeout !== null) {
    clearTimeout(ringTimeout)
    ringTimeout = null
  }
}

function cancelClearTimeout(): void {
  if (clearTimeoutHandle !== null) {
    clearTimeout(clearTimeoutHandle)
    clearTimeoutHandle = null
  }
}

function scheduleClear(): void {
  cancelClearTimeout()
  clearTimeoutHandle = setTimeout(() => {
    const state = useCallStore.getState()
    if (state.phase === 'ended') state.clear()
  }, ENDED_DISMISS_MS)
}

function teardownEngine(): void {
  cancelRingTimeout()
  if (engine) {
    engine.teardown()
    engine = null
  }
  pendingOfferSdp = null
  pendingSignals = []
}

function endCall(error?: string): void {
  teardownEngine()
  useCallStore.getState().end(error)
  scheduleClear()
}

function createEngine(polite: boolean): CallEngine {
  teardownEngine()
  engine = new CallEngine({
    polite,
    onSignal: (data) => {
      const state = useCallStore.getState()
      if (state.callId) void emitCallSignal(state.callId, data).catch(() => {})
    },
    onRemoteStream: (stream) => {
      useCallStore.getState().setStreams({
        localStream: engine?.getLocalStream() ?? null,
        remoteStream: stream,
      })
    },
    onRemoteVideo: (active) => {
      useCallStore.getState().setRemoteVideo(active)
    },
    onFailure: (message) => {
      const state = useCallStore.getState()
      if (state.phase === 'idle' || state.phase === 'ended') return
      endCall(message)
    },
  })
  return engine
}

function startRingTimeout(callId: string): void {
  cancelRingTimeout()
  ringTimeout = setTimeout(() => {
    const state = useCallStore.getState()
    if (state.callId !== callId) return
    if (state.phase === 'calling') {
      void emitCallHangup(callId, 'no-answer').catch(() => {})
      endCall('Нет ответа')
      return
    }
    if (state.phase === 'ringing') {
      teardownEngine()
      useCallStore.getState().end()
      scheduleClear()
    }
  }, RING_TIMEOUT_MS)
}

export async function startCall(params: {
  channelId: number
  mode: CallMode
  peer: UserProfile
}): Promise<void> {
  const state = useCallStore.getState()
  if (state.phase !== 'idle' && state.phase !== 'ended') return
  cancelClearTimeout()

  const callId = crypto.randomUUID()
  state.beginOutgoing({ callId, channelId: params.channelId, mode: params.mode, peer: params.peer })

  const localEngine = createEngine(false)
  try {
    await localEngine.startLocalMedia(params.mode)
  } catch {
    endCall('Не удалось получить доступ к микрофону или камере')
    return
  }
  state.setStreams({ localStream: localEngine.getLocalStream(), remoteStream: null })

  let offer: string
  try {
    offer = await localEngine.createOffer()
  } catch {
    endCall('Не удалось установить соединение')
    return
  }

  try {
    const result = await emitCallOffer({ callId, channelId: params.channelId, mode: params.mode, sdp: offer })
    if (result.outcome === 'offline') {
      endCall('Пользователь не в сети')
      return
    }
    if (result.outcome === 'busy') {
      endCall('Пользователь сейчас занят')
      return
    }
    startRingTimeout(callId)
  } catch (err) {
    endCall(err instanceof Error ? err.message : 'Не удалось вызвать абонента')
  }
}

export async function accept(): Promise<void> {
  const state = useCallStore.getState()
  if (state.phase !== 'ringing' || state.direction !== 'incoming' || !state.peer) return
  cancelClearTimeout()
  cancelRingTimeout()

  const callId = state.callId
  const mode = state.mode
  const offerSdp = pendingOfferSdp
  if (!callId || !offerSdp) return

  const localEngine = createEngine(true)
  try {
    await localEngine.startLocalMedia(mode)
  } catch {
    endCall('Не удалось получить доступ к микрофону или камере')
    return
  }
  state.setStreams({ localStream: localEngine.getLocalStream(), remoteStream: null })

  for (const data of pendingSignals) {
    void localEngine.handleSignal(data).catch(() => {})
  }
  pendingSignals = []

  let answer: string
  try {
    answer = await localEngine.acceptIncoming(offerSdp)
  } catch {
    endCall('Не удалось установить соединение')
    return
  }
  state.activate()
  pendingOfferSdp = null
  void emitCallAnswer(callId, answer).catch((err: unknown) => {
    endCall(err instanceof Error ? err.message : 'Не удалось ответить на звонок')
  })
}

export function decline(): void {
  const state = useCallStore.getState()
  if (state.phase !== 'ringing' || state.direction !== 'incoming') return
  const callId = state.callId
  teardownEngine()
  state.end()
  scheduleClear()
  if (callId) void emitCallReject(callId).catch(() => {})
}

export function hangup(reason = 'hangup'): void {
  const state = useCallStore.getState()
  if (state.phase !== 'calling' && state.phase !== 'ringing' && state.phase !== 'active') return
  const callId = state.callId
  teardownEngine()
  state.end()
  scheduleClear()
  if (callId) void emitCallHangup(callId, reason).catch(() => {})
}

export async function toggleMic(): Promise<void> {
  const state = useCallStore.getState()
  if (state.phase !== 'active' || !engine) return
  const next = !state.micOn
  engine.setMicEnabled(next)
  state.setMic(next)
}

export async function toggleCam(): Promise<void> {
  const state = useCallStore.getState()
  if (state.phase !== 'active' || !engine) return
  const next = !state.camOn
  try {
    await engine.setCamEnabled(next)
  } catch {
    return
  }
  state.setCam(next)
}

export async function startShare(): Promise<void> {
  const state = useCallStore.getState()
  if (state.phase !== 'active' || !engine) return
  try {
    await engine.startScreenShare()
  } catch {
    return
  }
  state.setScreen(true)
}

export async function stopShare(): Promise<void> {
  const state = useCallStore.getState()
  if (!engine || !state.screenOn) return
  try {
    await engine.stopScreenShare()
  } catch {
    return
  }
  state.setScreen(false)
}

export function onCallIncoming(payload: CallIncomingPayload): void {
  const state = useCallStore.getState()
  if (state.phase === 'calling' || state.phase === 'ringing' || state.phase === 'active') return
  cancelClearTimeout()
  pendingOfferSdp = payload.sdp
  pendingSignals = []
  state.beginIncoming(payload)
  startRingTimeout(payload.callId)
}

export function onCallAnswered(payload: CallAnsweredPayload): void {
  const state = useCallStore.getState()
  if (state.phase !== 'calling' || state.callId !== payload.callId) return
  cancelRingTimeout()
  if (!engine) return
  engine
    .handleSignal({ type: 'answer', sdp: payload.sdp })
    .catch(() => endCall('Не удалось установить соединение'))
  state.activate()
}

export function onCallSignal(payload: CallSignalPayload): void {
  const state = useCallStore.getState()
  if (state.callId !== payload.callId) return
  if (state.phase === 'idle' || state.phase === 'ended') return
  if (!engine) {
    pendingSignals.push(payload.data)
    return
  }
  engine.handleSignal(payload.data).catch(() => {})
}

export function onCallRejected(payload: CallRejectedPayload): void {
  const state = useCallStore.getState()
  if (state.callId !== payload.callId || state.phase !== 'calling') return
  endCall('Собеседник отклонил вызов')
}

export function onCallEnded(payload: CallEndedPayload): void {
  const state = useCallStore.getState()
  if (state.callId !== payload.callId) return
  if (payload.reason === 'no-answer' && state.direction === 'incoming') {
    endCall()
    return
  }
  endCall(payload.reason === 'disconnected' ? 'Собеседник отключился' : undefined)
}

export function onCallActive(payload: CallActivePayload): void {
  const state = useCallStore.getState()
  if (state.callId !== payload.callId || state.phase !== 'ringing') return
  teardownEngine()
  state.end()
  scheduleClear()
}

export function onSocketClosed(): void {
  teardownEngine()
  const state = useCallStore.getState()
  if (state.phase !== 'idle' && state.phase !== 'ended') {
    state.end()
    scheduleClear()
  }
}