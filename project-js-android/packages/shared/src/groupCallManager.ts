import type {
  GroupCallCreatedPayload,
  GroupCallInvitePayload,
  GroupCallPeerJoinedPayload,
  GroupCallPeerLeftPayload,
  GroupCallSignalPayload,
  GroupCallMLSMessagePayload,
  GroupCallNewProducerPayload,
  GroupCallPeerUpdatePayload,
  GroupCallPeer,
} from './types'
import { useGroupCallStore } from './groupCall/groupCallStore'
import { useCallStore } from './store/calls'

export function onGroupCallCreated(payload: any) {
  const store = useGroupCallStore.getState()
  if (store.state && store.state.callId === payload.callId) {
    store.setPhase('joined')
  }
}

export function onGroupCallInvite(payload: any) {
  const store = useGroupCallStore.getState()
  // Show notification to user about incoming group call invite
  console.log('Group call invite received:', payload)
  // Could dispatch to UI notification system
}

export function onGroupCallPeerJoined(payload: any) {
  const store = useGroupCallStore.getState()
  if (store.state && store.state.callId === payload.callId) {
    if (payload.peer) {
      store.addParticipant(payload.peer)
    }
  }
}

export function onGroupCallPeerLeft(payload: any) {
  const store = useGroupCallStore.getState()
  if (store.state && store.state.callId === payload.callId) {
    store.removeParticipant(payload.peerId)
  }
}

export function onGroupCallSignal(payload: any) {
  // Handle signaling between peers
  console.log('Group call signal received:', payload)
  // Forward to GroupCallEngine for handling
}

export function onGroupCallMLSMessage(payload: any) {
  // Handle MLS messages (welcome, commit, etc.)
  console.log('MLS message received:', payload)
  // Forward to GroupCallEngine for processing
}

export function onGroupCallNewProducer(payload: any) {
  const store = useGroupCallStore.getState()
  if (store.state && store.state.callId === payload.callId) {
    // New producer available for consumption
    console.log('New producer available:', payload)
  }
}

export function onGroupCallPeerUpdate(payload: any) {
  const store = useGroupCallStore.getState()
  if (store.state && store.state.callId === payload.callId && payload.peerId) {
    store.updateParticipant(payload.peerId, payload.updates)
  }
}