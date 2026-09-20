import type { CallMode, CallSignalData } from './types'

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

export type EngineOptions = {
  onSignal: (data: CallSignalData) => void
  onRemoteStream: (stream: MediaStream) => void
  onFailure: (message: string) => void
}

export class CallEngine {
  private pc: RTCPeerConnection
  private localStream: MediaStream
  private remoteStream = new MediaStream()
  private camEnabled = false
  private cameraTrack: MediaStreamTrack | null = null
  private screenStream: MediaStream | null = null
  private pendingCandidates: RTCIceCandidateInit[] = []
  private makingOffer = false
  private handshakeComplete = false
  private closed = false
  private onSignal: (data: CallSignalData) => void
  private onRemoteStream: (stream: MediaStream) => void
  private onFailure: (message: string) => void

  constructor(options: EngineOptions) {
    this.onSignal = options.onSignal
    this.onRemoteStream = options.onRemoteStream
    this.onFailure = options.onFailure
    this.localStream = new MediaStream()
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    this.pc.onicecandidate = (event) => {
      this.onSignal({ type: 'ice', candidate: event.candidate ? event.candidate.toJSON() : null })
    }
    this.pc.ontrack = (event) => {
      this.remoteStream.addTrack(event.track)
      this.onRemoteStream(this.remoteStream)
    }
    this.pc.onconnectionstatechange = () => {
      if (this.closed) return
      if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') {
        this.onFailure('Соединение было прервано')
      }
    }
    this.pc.onnegotiationneeded = () => {
      if (this.handshakeComplete) void this.renegotiate()
    }
  }

  async startLocalMedia(mode: CallMode): Promise<MediaStream> {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    })
    this.localStream = media
    media.getTracks().forEach((track) => this.pc.addTrack(track, media))
    if (mode === 'video') {
      const track = media.getVideoTracks()[0]
      if (track) {
        this.cameraTrack = track
        this.camEnabled = true
      }
    }
    return media
  }

  async createOffer(): Promise<string> {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer.sdp ?? ''
  }

  async acceptIncoming(offerSdp: string): Promise<string> {
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
    if (this.screenStream) return
    const sender = this.getVideoSender()
    if (enabled) {
      if (!this.cameraTrack) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        this.cameraTrack = stream.getVideoTracks()[0] ?? null
        if (this.cameraTrack) {
          this.localStream.addTrack(this.cameraTrack)
        }
      }
      if (this.cameraTrack) {
        this.cameraTrack.enabled = true
      }
      if (sender) {
        await sender.replaceTrack(this.cameraTrack)
      } else if (this.cameraTrack) {
        this.pc.addTrack(this.cameraTrack, this.localStream)
      }
      await this.renegotiate()
      return
    }
    if (sender && sender.track !== null) {
      await sender.replaceTrack(null)
      await this.renegotiate()
    }
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
    const sender = this.getVideoSender()
    if (sender) {
      await sender.replaceTrack(track)
    } else {
      this.pc.addTrack(track, this.localStream)
    }
    this.localStream.addTrack(track)
    track.addEventListener('ended', () => {
      if (this.screenStream === stream) void this.stopScreenShare()
    })
    await this.renegotiate()
    return stream
  }

  async stopScreenShare(): Promise<void> {
    const stream = this.screenStream
    if (!stream) return
    this.screenStream = null
    const track = stream.getVideoTracks()[0]
    if (track) this.localStream.removeTrack(track)
    stream.getTracks().forEach((t) => t.stop())
    const sender = this.getVideoSender()
    if (sender) {
      await sender.replaceTrack(this.camEnabled ? this.cameraTrack : null)
      await this.renegotiate()
    }
  }

  teardown(): void {
    if (this.closed) return
    this.closed = true
    this.localStream.getTracks().forEach((track) => track.stop())
    this.screenStream?.getTracks().forEach((track) => track.stop())
    this.pc.getSenders().forEach((sender) => sender.track?.stop())
    this.pc.close()
  }

  getLocalStream(): MediaStream {
    return this.localStream
  }

  private getVideoSender(): RTCRtpSender | null {
    return this.pc.getSenders().find((sender) => sender.track?.kind === 'video') ?? null
  }

  private async handleOffer(sdp: string): Promise<void> {
    if (this.makingOffer || this.pc.signalingState !== 'stable') return
    await this.pc.setRemoteDescription({ type: 'offer', sdp })
    await this.flushCandidates()
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.onSignal({ type: 'answer', sdp: answer.sdp ?? '' })
  }

  private async handleAnswer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp })
    await this.flushCandidates()
    this.handshakeComplete = true
  }

  private async handleIce(candidate: RTCIceCandidateInit | null): Promise<void> {
    if (!candidate) return
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

  private async renegotiate(): Promise<void> {
    if (this.closed || this.makingOffer || this.pc.signalingState !== 'stable') return
    this.makingOffer = true
    try {
      await this.pc.setLocalDescription(await this.pc.createOffer())
      this.onSignal({ type: 'offer', sdp: this.pc.localDescription?.sdp ?? '' })
    } catch (err) {
      console.warn('Не удалось пересогласовать соединение', err)
    } finally {
      this.makingOffer = false
    }
  }
}