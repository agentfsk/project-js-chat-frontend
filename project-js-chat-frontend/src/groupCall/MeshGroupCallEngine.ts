import type { GroupCallMode } from './types'

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24 },
}

export type MeshSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }

export type MeshEngineConfig = {
  callId: string
  userId: string
  mode: GroupCallMode
  existingPeerIds: string[]
  sendSignal: (targetUserId: string, signal: MeshSignal) => Promise<void>
  onLocalStream?: (stream: MediaStream) => void
  onLocalTrackStopped?: (kind: 'audio' | 'video') => void
  onRemoteTrack?: (userId: string, track: MediaStreamTrack) => void
  onRemoteTrackRemoved?: (userId: string) => void
  onError?: (message: string) => void
}

type PeerState = {
  pc: RTCPeerConnection
  stream: MediaStream
  videoSender: RTCRtpSender
  pendingCandidates: RTCIceCandidateInit[]
  localCandidates: RTCIceCandidateInit[]
  remoteDescriptionSet: boolean
  signalsReady: boolean
}

export class MeshGroupCallEngine {
  private config: MeshEngineConfig | null = null
  private localStream: MediaStream | null = null
  private audioTrack: MediaStreamTrack | null = null
  private cameraTrack: MediaStreamTrack | null = null
  private screenTrack: MediaStreamTrack | null = null
  private peers = new Map<string, PeerState>()
  private started = false

  async start(config: MeshEngineConfig): Promise<void> {
    if (this.started) await this.leave()
    this.config = config

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: config.mode === 'video' ? VIDEO_CONSTRAINTS : false,
      })
      this.localStream = stream
      this.audioTrack = stream.getAudioTracks()[0] ?? null
      this.cameraTrack = stream.getVideoTracks()[0] ?? null
      this.started = true
      config.onLocalStream?.(stream)

      for (const peerId of config.existingPeerIds) {
        void this.createOffer(peerId)
      }
    } catch (error) {
      this.started = false
      this.config = null
      throw error
    }
  }

  async leave(): Promise<void> {
    for (const peerId of Array.from(this.peers.keys())) {
      this.removePeer(peerId)
    }
    this.screenTrack?.stop()
    this.screenTrack = null
    this.localStream?.getTracks().forEach((track) => track.stop())
    this.localStream = null
    this.audioTrack = null
    this.cameraTrack = null
    this.config?.onLocalTrackStopped?.('audio')
    this.config?.onLocalTrackStopped?.('video')
    this.config = null
    this.started = false
  }

  isStarted(): boolean {
    return this.started
  }

  isMicMuted(): boolean {
    return !this.audioTrack || !this.audioTrack.enabled
  }

  isCameraOn(): boolean {
    return Boolean(this.cameraTrack?.enabled)
  }

  isScreenSharing(): boolean {
    return Boolean(this.screenTrack)
  }

  toggleMic(): boolean {
    if (!this.audioTrack) return true
    this.audioTrack.enabled = !this.audioTrack.enabled
    return !this.audioTrack.enabled
  }

  async toggleCam(): Promise<boolean> {
    if (!this.cameraTrack) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS })
      const track = stream.getVideoTracks()[0]
      if (!track) throw new Error('Не удалось включить камеру')
      this.cameraTrack = track
      for (const peer of this.peers.values()) {
        await peer.videoSender.replaceTrack(this.screenTrack ?? track)
      }
      this.config?.onLocalStream?.(new MediaStream([track]))
      return true
    }

    this.cameraTrack.enabled = !this.cameraTrack.enabled
    if (this.cameraTrack.enabled && !this.screenTrack) {
      this.config?.onLocalStream?.(new MediaStream([this.cameraTrack]))
    }
    return this.cameraTrack.enabled
  }

  async toggleScreenShare(): Promise<boolean> {
    if (this.screenTrack) {
      await this.stopScreenShare()
      return false
    }
    await this.startScreenShare()
    return true
  }

  async startScreenShare(): Promise<void> {
    if (this.screenTrack) return
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const track = display.getVideoTracks()[0]
    if (!track) throw new Error('Не удалось начать демонстрацию экрана')

    this.screenTrack = track
    for (const peer of this.peers.values()) {
      await peer.videoSender.replaceTrack(track)
    }
    track.onended = () => {
      void this.stopScreenShare()
    }
    this.config?.onLocalStream?.(new MediaStream([track]))
  }

  async stopScreenShare(): Promise<void> {
    const track = this.screenTrack
    if (!track) return
    this.screenTrack = null
    track.onended = null
    track.stop()

    const fallback = this.cameraTrack
    for (const peer of this.peers.values()) {
      await peer.videoSender.replaceTrack(fallback)
    }

    if (fallback) {
      this.config?.onLocalStream?.(new MediaStream([fallback]))
    } else {
      this.config?.onLocalTrackStopped?.('video')
    }
  }

  async handleSignal(fromUserId: string | number, signal: MeshSignal): Promise<void> {
    const peerId = String(fromUserId)
    let peer = this.peers.get(peerId)

    try {
      if (signal.type === 'offer') {
        if (!peer) peer = this.createPeer(peerId)
        await peer.pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
        peer.remoteDescriptionSet = true
        await this.flushCandidates(peer)
        const answer = await peer.pc.createAnswer()
        await peer.pc.setLocalDescription(answer)
        await this.sendSignal(peerId, { type: 'answer', sdp: answer.sdp ?? '' })
        peer.signalsReady = true
        await this.flushLocalCandidates(peerId, peer)
        return
      }

      if (!peer) return

      if (signal.type === 'answer') {
        await peer.pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
        peer.remoteDescriptionSet = true
        await this.flushCandidates(peer)
        return
      }

      if (peer.remoteDescriptionSet) {
        await peer.pc.addIceCandidate(signal.candidate)
      } else {
        peer.pendingCandidates.push(signal.candidate)
      }
    } catch (error) {
      this.config?.onError?.(error instanceof Error ? error.message : 'Ошибка WebRTC')
    }
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId)
    if (!peer) return
    this.peers.delete(peerId)
    peer.pc.close()
    this.config?.onRemoteTrackRemoved?.(peerId)
  }

  private createPeer(peerId: string): PeerState {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const stream = new MediaStream()

    if (this.audioTrack) {
      pc.addTrack(this.audioTrack, ...(this.localStream ? [this.localStream] : []))
    }

    const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' })
    const activeVideo = this.screenTrack ?? this.cameraTrack
    if (activeVideo) {
      void videoTransceiver.sender.replaceTrack(activeVideo)
    }

    const peer: PeerState = {
      pc,
      stream,
      videoSender: videoTransceiver.sender,
      pendingCandidates: [],
      localCandidates: [],
      remoteDescriptionSet: false,
      signalsReady: false,
    }

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return
      const payload = candidate.toJSON()
      if (peer.signalsReady) {
        void this.sendSignal(peerId, { type: 'candidate', candidate: payload })
      } else {
        peer.localCandidates.push(payload)
      }
    }

    pc.ontrack = ({ track }) => {
      stream.getTracks()
        .filter((existing) => existing.kind === track.kind)
        .forEach((existing) => stream.removeTrack(existing))
      stream.addTrack(track)
      this.config?.onRemoteTrack?.(peerId, track)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        this.config?.onError?.(`Не удалось установить соединение с участником ${peerId}`)
      }
    }

    this.peers.set(peerId, peer)
    return peer
  }

  private async createOffer(peerId: string): Promise<void> {
    if (!this.started) return
    const peer = this.createPeer(peerId)

    try {
      const offer = await peer.pc.createOffer()
      await peer.pc.setLocalDescription(offer)
      await this.sendSignal(peerId, { type: 'offer', sdp: offer.sdp ?? '' })
      peer.signalsReady = true
      await this.flushLocalCandidates(peerId, peer)
    } catch (error) {
      this.config?.onError?.(error instanceof Error ? error.message : 'Ошибка WebRTC')
    }
  }

  private async flushCandidates(peer: PeerState): Promise<void> {
    const candidates = peer.pendingCandidates.splice(0)
    for (const candidate of candidates) {
      await peer.pc.addIceCandidate(candidate)
    }
  }

  private async flushLocalCandidates(peerId: string, peer: PeerState): Promise<void> {
    const candidates = peer.localCandidates.splice(0)
    for (const candidate of candidates) {
      await this.sendSignal(peerId, { type: 'candidate', candidate })
    }
  }

  private async sendSignal(targetUserId: string, signal: MeshSignal): Promise<void> {
    try {
      await this.config?.sendSignal(targetUserId, signal)
    } catch {
      // Peer may have left while the signal was in flight.
    }
  }
}

export function createMeshGroupCallEngine(): MeshGroupCallEngine {
  return new MeshGroupCallEngine()
}
