import type { CallMode, CallSignalData } from './types'

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

export type EngineOptions = {
  onSignal: (data: CallSignalData) => void
  onRemoteStream: (stream: MediaStream) => void
  onFailure: (message: string) => void
  polite?: boolean
}

export class CallEngine {
  private pc: RTCPeerConnection
  private localStream: MediaStream
  private remoteStream = new MediaStream()
  private camEnabled = false
  private cameraTrack: MediaStreamTrack | null = null
  private videoTransceiver: RTCRtpTransceiver | null = null
  private screenStream: MediaStream | null = null
  private pendingCandidates: RTCIceCandidateInit[] = []
  private makingOffer = false
  private ignoreOffer = false
  private negotiationNeeded = false
  private negotiationScheduled = false
  private handshakeComplete = false
  private closed = false
  private polite: boolean
  private onSignal: (data: CallSignalData) => void
  private onRemoteStream: (stream: MediaStream) => void
  private onFailure: (message: string) => void

  constructor(options: EngineOptions) {
    this.polite = options.polite ?? false
    this.onSignal = options.onSignal
    this.onRemoteStream = options.onRemoteStream
    this.onFailure = options.onFailure
    this.localStream = new MediaStream()
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    this.pc.onicecandidate = (event) => {
      this.onSignal({ type: 'ice', candidate: event.candidate ? event.candidate.toJSON() : null })
    }
    this.pc.ontrack = (event) => {
      this.updateRemoteStream(event.track)
    }
    this.pc.onconnectionstatechange = () => {
      if (this.closed) return
      if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') {
        this.onFailure('Соединение было прервано')
      }
    }
    this.pc.onnegotiationneeded = () => {
      if (this.handshakeComplete) this.requestNegotiation()
    }
  }

  async startLocalMedia(mode: CallMode): Promise<MediaStream> {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    })
    this.localStream = media
    const audioTrack = media.getAudioTracks()[0]
    if (audioTrack) this.pc.addTrack(audioTrack, media)
    if (mode === 'video') {
      const track = media.getVideoTracks()[0]
      if (track) {
        this.cameraTrack = track
        this.camEnabled = true
        this.videoTransceiver = this.pc.addTransceiver(track, { streams: [this.localStream] })
      }
    }
    this.syncLocalVideoTrack()
    return media
  }

  async createOffer(): Promise<string> {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer.sdp ?? ''
  }

  async acceptIncoming(offerSdp: string): Promise<string> {
    this.ignoreOffer = false
    await this.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp })
    await this.flushCandidates()
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.handshakeComplete = true
    return answer.sdp ?? ''
  }

  async handleSignal(data: CallSignalData): Promise<void> {
    if (this.closed) return
    if (data.type === 'offer') {
      await this.handleOffer(data.sdp)
      return
    }
    if (data.type === 'answer') {
      await this.handleAnswer(data.sdp)
      return
    }
    await this.handleIce(data.candidate)
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  async setCamEnabled(enabled: boolean): Promise<void> {
    this.camEnabled = enabled
    if (this.screenStream) {
      if (this.cameraTrack) this.cameraTrack.enabled = enabled
      return
    }
    if (enabled) {
      if (!this.cameraTrack) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        this.cameraTrack = stream.getVideoTracks()[0] ?? null
      }
      if (!this.cameraTrack) return
      this.cameraTrack.enabled = true
      if (!this.videoTransceiver) {
        this.videoTransceiver = this.pc.addTransceiver(this.cameraTrack, { streams: [this.localStream] })
      }
      this.syncLocalVideoTrack()
      await this.setVideoSource()
      this.requestNegotiation()
      return
    }
    if (this.cameraTrack) this.cameraTrack.enabled = false
    this.syncLocalVideoTrack()
    await this.setVideoSource()
    this.requestNegotiation()
  }

  async startScreenShare(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Демонстрация экрана не поддерживается браузером')
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const track = stream.getVideoTracks()[0]
    if (!track) {
      stream.getTracks().forEach((t) => t.stop())
      throw new Error('Не удалось захватить экран')
    }
    this.screenStream = stream
    track.addEventListener('ended', () => {
      if (this.screenStream === stream) void this.stopScreenShare()
    })
    if (!this.videoTransceiver) {
      this.videoTransceiver = this.pc.addTransceiver(track, { streams: [this.localStream] })
    }
    this.syncLocalVideoTrack()
    await this.setVideoSource()
    this.requestNegotiation()
    return stream
  }

  async stopScreenShare(): Promise<void> {
    const stream = this.screenStream
    if (!stream) return
    this.screenStream = null
    stream.getTracks().forEach((t) => t.stop())
    this.syncLocalVideoTrack()
    await this.setVideoSource()
    this.requestNegotiation()
  }

  teardown(): void {
    if (this.closed) return
    this.closed = true
    const tracks = new Set<MediaStreamTrack>(this.localStream.getTracks())
    if (this.cameraTrack) tracks.add(this.cameraTrack)
    this.screenStream?.getTracks().forEach((t) => tracks.add(t))
    tracks.forEach((track) => track.stop())
    this.pc.getSenders().forEach((sender) => sender.track?.stop())
    this.pc.close()
  }

  getLocalStream(): MediaStream {
    return this.localStream
  }

  requestNegotiation(): void {
    if (this.closed) return
    this.negotiationNeeded = true
    if (!this.negotiationScheduled) {
      this.negotiationScheduled = true
      queueMicrotask(() => void this.drainNegotiation())
    }
  }

  private async drainNegotiation(): Promise<void> {
    this.negotiationScheduled = false
    if (this.closed) return
    if (this.makingOffer || this.pc.signalingState !== 'stable') {
      this.negotiationNeeded = true
      return
    }
    if (!this.negotiationNeeded) return
    this.negotiationNeeded = false
    this.makingOffer = true
    try {
      await this.pc.setLocalDescription()
      const sdp = this.pc.localDescription?.sdp ?? ''
      if (sdp) this.onSignal({ type: 'offer', sdp })
    } catch (err) {
      this.negotiationNeeded = true
      console.warn('Не удалось пересогласовать соединение', err)
    } finally {
      this.makingOffer = false
      if (this.negotiationNeeded && this.pc.signalingState === 'stable') {
        await this.drainNegotiation()
      }
    }
  }

  private async setVideoSource(): Promise<void> {
    if (!this.videoTransceiver) return
    if (this.screenStream) {
      this.videoTransceiver.direction = 'sendrecv'
      const screenTrack = this.screenStream.getVideoTracks()[0] ?? null
      if (screenTrack) await this.videoTransceiver.sender.replaceTrack(screenTrack)
      return
    }
    this.videoTransceiver.direction = this.camEnabled ? 'sendrecv' : 'recvonly'
    if (this.cameraTrack) {
      await this.videoTransceiver.sender.replaceTrack(this.cameraTrack)
    }
  }

  private syncLocalVideoTrack(): void {
    for (const track of this.localStream.getVideoTracks()) {
      this.localStream.removeTrack(track)
    }
    let source: MediaStreamTrack | null = null
    if (this.screenStream) {
      source = this.screenStream.getVideoTracks()[0] ?? null
    } else if (this.cameraTrack) {
      source = this.cameraTrack
    }
    if (source) this.localStream.addTrack(source)
  }

  private updateRemoteStream(newTrack: MediaStreamTrack): void {
    const existingSameKind = this.remoteStream.getTracks().find((t) => t.kind === newTrack.kind)
    if (existingSameKind) {
      const replacement = new MediaStream()
      this.remoteStream.getTracks().forEach((t) => {
        if (t.kind !== newTrack.kind) replacement.addTrack(t)
      })
      replacement.addTrack(newTrack)
      this.remoteStream = replacement
    } else {
      this.remoteStream.addTrack(newTrack)
    }
    this.onRemoteStream(this.remoteStream)
  }

  private async handleOffer(sdp: string): Promise<void> {
    const offerCollision = this.makingOffer || this.pc.signalingState !== 'stable'
    this.ignoreOffer = !this.polite && offerCollision
    if (this.ignoreOffer) return
    if (this.pc.signalingState === 'have-local-offer') {
      try {
        await this.pc.setLocalDescription({ type: 'rollback' })
      } catch (err) {
        console.warn('Не удалось откатить локальный offer', err)
      }
    }
    await this.pc.setRemoteDescription({ type: 'offer', sdp })
    await this.flushCandidates()
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.onSignal({ type: 'answer', sdp: answer.sdp ?? '' })
    if (this.negotiationNeeded) this.requestNegotiation()
  }

  private async handleAnswer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp })
    await this.flushCandidates()
    this.ignoreOffer = false
    this.handshakeComplete = true
    if (this.negotiationNeeded) this.requestNegotiation()
  }

  private async handleIce(candidate: RTCIceCandidateInit | null): Promise<void> {
    if (!candidate) return
    if (this.ignoreOffer) return
    if (this.pc.remoteDescription === null) {
      this.pendingCandidates.push(candidate)
      return
    }
    try {
      await this.pc.addIceCandidate(candidate)
    } catch (err) {
      console.warn('Не удалось добавить ICE-кандидат', err)
    }
  }

  private async flushCandidates(): Promise<void> {
    const candidates = this.pendingCandidates
    this.pendingCandidates = []
    for (const candidate of candidates) {
      try {
        await this.pc.addIceCandidate(candidate)
      } catch (err) {
        console.warn('Не удалось добавить ICE-кандидат', err)
      }
    }
  }
}