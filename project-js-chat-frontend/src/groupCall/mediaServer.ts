import { io, type Socket } from 'socket.io-client'
import { MEDIA_SERVER_URL } from '../config'

export type MediaTransportInfo = {
  id: string
  iceParameters: any
  iceCandidates: any[]
  dtlsParameters: any
}

export type MediaProducerInfo = {
  producerId: string
  producerUserId: string
  kind: 'audio' | 'video'
  appData?: Record<string, unknown>
}

export type MediaJoinResult = {
  routerRtpCapabilities: any
  iceServers: RTCIceServer[]
  sendTransport: MediaTransportInfo
  recvTransport: MediaTransportInfo
  producers: MediaProducerInfo[]
  peers: Array<{ userId: string | number; updates?: Record<string, unknown> }>
}

type AckPayload = { success?: boolean; error?: string }

let socket: Socket | null = null

export function getMediaSocket(): Socket {
  if (!socket) {
    socket = io(MEDIA_SERVER_URL || undefined, {
      path: '/socket.io',
      transports: ['websocket'],
    })
  }
  return socket
}

export function disconnectMediaSocket(): void {
  socket?.disconnect()
  socket = null
}

function emitWithAck<T extends AckPayload>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const active = getMediaSocket()
    active.emit(event, payload, (ack: T) => {
      if (ack && ack.success) {
        resolve(ack)
      } else {
        reject(new Error(ack?.error ?? 'Media server error'))
      }
    })
  })
}

export function createMediaCall(params: {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  userId: string
}): Promise<{ callId: string; routerRtpCapabilities: any; iceServers: RTCIceServer[] }> {
  return emitWithAck<{ callId: string; routerRtpCapabilities: any; iceServers: RTCIceServer[] } & AckPayload>('groupCallCreate', params)
}

export async function joinMediaCall(params: {
  callId: string
  userId: string
  rtpCapabilities: any
}): Promise<MediaJoinResult> {
  const ack = await emitWithAck<MediaJoinResult & AckPayload>('groupCallJoin', params)
  return ack
}

export function connectMediaTransport(params: {
  callId: string
  transportId: string
  dtlsParameters: any
}): Promise<void> {
  return emitWithAck('groupCallTransportConnect', params).then(() => undefined)
}

export async function produceMedia(params: {
  callId: string
  userId: string
  kind: 'audio' | 'video'
  rtpParameters: any
  appData: any
}): Promise<{ producerId: string }> {
  const ack = await emitWithAck<{ producerId: string } & AckPayload>('groupCallProduce', params)
  return { producerId: ack.producerId }
}

export async function consumeMedia(params: {
  callId: string
  userId: string
  producerId: string
  rtpCapabilities: any
}): Promise<{ consumerId: string; producerId: string; kind: 'audio' | 'video'; rtpParameters: any }> {
  return emitWithAck<{ consumerId: string; producerId: string; kind: 'audio' | 'video'; rtpParameters: any } & AckPayload>('groupCallConsume', params)
}

export function leaveMediaCall(params: { callId: string; userId: string }): Promise<void> {
  return emitWithAck('groupCallLeave', params).then(() => undefined)
}

export function sendMediaMLSMessage(params: {
  callId: string
  userId: string
  message: any
}): Promise<void> {
  return emitWithAck('groupCallMLSMessage', params).then(() => undefined)
}

export function updateMediaPeer(params: {
  callId: string
  userId: string
  updates: Record<string, unknown>
}): Promise<void> {
  return emitWithAck('groupCallPeerUpdate', params).then(() => undefined)
}
