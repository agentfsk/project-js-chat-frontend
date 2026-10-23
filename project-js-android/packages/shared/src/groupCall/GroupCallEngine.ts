import { Device } from 'mediasoup-client'
import type { Producer, Consumer, Transport, RtpCapabilities, RtpParameters } from 'mediasoup-client/types'
import { SFrameEncryptor, SFrameDecryptor } from '../crypto/sframe'
import { MLSGroupManager, type MLSGroup, type MLSWelcome, type MLSCommit } from './mls'
import type {
  GroupCallEngineConfig,
  GroupCallEngineEvents,
  GroupCallState,
  GroupCallParticipant,
  GroupCallPhase,
  GroupCallMode,
  ConnectionState,
  SFrameKey,
} from './types'

export class GroupCallEngine {
  private device: Device | null = null
  private sendTransport: Transport | null = null
  private recvTransport: Transport | null = null
  private localProducers: Map<string, Producer> = new Map()
  private remoteConsumers: Map<string, Consumer> = new Map()
  private sframeKeys: Map<number, SFrameKey> = new Map()
  private localKeyId: number = 0
  private mlsGroup: MLSGroup | null = null
  private conversationId: string | null = null
  private config: GroupCallEngineConfig | null = null
  private joined = false
  private connectionState: ConnectionState = 'new'
  private statsInterval: ReturnType<typeof setInterval> | null = null

  onStateChange: GroupCallEngineEvents['onStateChange'] = () => {}
  onParticipantJoined: GroupCallEngineEvents['onParticipantJoined'] = () => {}
  onParticipantLeft: GroupCallEngineEvents['onParticipantLeft'] = () => {}
  onParticipantUpdated: GroupCallEngineEvents['onParticipantUpdated'] = () => {}
  onLocalMediaStarted: GroupCallEngineEvents['onLocalMediaStarted'] = () => {}
  onLocalMediaStopped: GroupCallEngineEvents['onLocalMediaStopped'] = () => {}
  onRemoteTrackReceived: GroupCallEngineEvents['onRemoteTrackReceived'] = () => {}
  onRemoteTrackRemoved: GroupCallEngineEvents['onRemoteTrackRemoved'] = () => {}
  onError: GroupCallEngineEvents['onError'] = () => {}
  onConnectionStateChange: GroupCallEngineEvents['onConnectionStateChange'] = () => {}

  async join(config: GroupCallEngineConfig): Promise<void> {
    if (this.joined) {
      await this.leave()
    }

    this.config = config

    try {
      this.setConnectionState('connecting')

      this.device = await Device.factory()
      await this.device.load({ routerRtpCapabilities: config.rtpCapabilities })

      await this.createSendTransport(config.iceServers)
      await this.createRecvTransport(config.iceServers)

      if (config.mode === 'video') {
        await this.produceVideo()
      }
      await this.produceAudio()

      this.joined = true
      this.setConnectionState('connected')
      this.setPhase('joined')

      this.startStatsCollection()

      this.emitStateChange()
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  async leave(): Promise<void> {
    this.stopStatsCollection()

    for (const producer of this.localProducers.values()) {
      producer.close()
    }
    this.localProducers.clear()

    for (const consumer of this.remoteConsumers.values()) {
      consumer.close()
    }
    this.remoteConsumers.clear()

    this.sendTransport?.close()
    this.sendTransport = null
    this.recvTransport?.close()
    this.recvTransport = null

    this.device = null
    this.joined = false
    this.mlsGroup = null
    this.conversationId = null
    this.sframeKeys.clear()
    this.localKeyId = 0

    this.setConnectionState('disconnected')
    this.setPhase('ended')
    this.emitStateChange()
  }

  async toggleMic(): Promise<void> {
    const producer = this.localProducers.get('audio')
    if (producer) {
      if (producer.paused) {
        await producer.resume()
      } else {
        await producer.pause()
      }
      this.emitStateChange()
    }
  }

  async toggleCam(): Promise<void> {
    const producer = this.localProducers.get('video')
    if (producer) {
      if (producer.paused) {
        await producer.resume()
      } else {
        await producer.pause()
      }
      this.emitStateChange()
    }
  }

  async startScreenShare(): Promise<void> {
    if (!this.config || this.localProducers.has('screen')) return

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const track = stream.getVideoTracks()[0]
      if (!track) throw new Error('No video track in screen share')

      const producer = await this.sendTransport!.produce({
        track,
        encodings: [
          { maxBitrate: 3000000, scaleResolutionDownBy: 1 },
          { maxBitrate: 1500000, scaleResolutionDownBy: 2 },
          { maxBitrate: 500000, scaleResolutionDownBy: 4 },
        ],
        codecOptions: { videoGoogleStartBitrate: 1000 },
        appData: { ...this.config.appData, source: 'screen' },
      })

      this.localProducers.set('screen', producer)
      this.setupProducerEvents(producer, 'screen')

      track.addEventListener('ended', () => {
        this.stopScreenShare()
      })

      this.onLocalMediaStarted?.(stream)
      this.emitStateChange()
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error('Failed to start screen share'))
    }
  }

  async stopScreenShare(): Promise<void> {
    const producer = this.localProducers.get('screen')
    if (producer) {
      producer.close()
      this.localProducers.delete('screen')
      this.onLocalMediaStopped?.('video')
      this.emitStateChange()
    }
  }

  async toggleScreenShare(): Promise<void> {
    if (this.localProducers.has('screen')) {
      await this.stopScreenShare()
    } else {
      await this.startScreenShare()
    }
  }

  async initializeSFrameKeys(mlsGroup: MLSGroup): Promise<void> {
    this.mlsGroup = mlsGroup
    this.sframeKeys = await MLSGroupManager.deriveSFrameKeys(mlsGroup)

    if (this.mlsGroup.members.has(this.config?.userId || '')) {
      const member = this.mlsGroup.members.get(this.config!.userId!)
      if (member) {
        this.localKeyId = member.index
      }
    }

    for (const producer of this.localProducers.values()) {
      producer.appData = { ...producer.appData, keyId: this.localKeyId }
    }
  }

  async processWelcome(welcome: MLSWelcome): Promise<void> {
    if (!this.config) return
    const { identityKey } = await this.getIdentityKeys()
    const result = await MLSGroupManager.processWelcome(welcome.welcomeEnvelope, identityKey)
    this.mlsGroup = result.group
    this.conversationId = result.conversationId
    await this.initializeSFrameKeys(this.mlsGroup)
  }

  async processCommit(): Promise<void> {
    if (!this.mlsGroup || !this.conversationId) return
    this.mlsGroup = await MLSGroupManager.processCommit(this.mlsGroup, this.conversationId)
    this.sframeKeys = await MLSGroupManager.deriveSFrameKeys(this.mlsGroup)
    this.emitStateChange()
  }

  async sendMLSMessage(message: any): Promise<void> {
    if (!this.config) return
    await this.config.events.onMLSMessage?.({
      callId: this.config.callId,
      message,
    })
  }

  private async createSendTransport(iceServers: RTCIceServer[]): Promise<void> {
    if (!this.device) throw new Error('Device not initialized')

    const transport = this.device.createSendTransport({
      iceServers,
      iceTransportPolicy: 'all',
    } as any)

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.config!.events.onTransportConnect?.({
          transportId: transport.id,
          dtlsParameters,
        })
        callback()
      } catch (error) {
        errback(error instanceof Error ? error : new Error(String(error)))
      }
    })

    transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const result = await this.config!.events.onProduce?.({
          kind,
          rtpParameters,
          appData,
        })
        if (result?.producerId) {
          callback({ id: result.producerId })
        } else {
          errback(new Error('No producerId returned'))
        }
      } catch (error) {
        errback(error instanceof Error ? error : new Error(String(error)))
      }
    })

    transport.on('connectionstatechange', (state) => {
      if (state === 'failed' || state === 'closed') {
        this.setConnectionState('failed')
      }
    })

    this.sendTransport = transport
  }

  private async createRecvTransport(iceServers: RTCIceServer[]): Promise<void> {
    if (!this.device) throw new Error('Device not initialized')

    const transport = this.device.createRecvTransport({
      iceServers,
      iceTransportPolicy: 'all',
    } as any)

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.config!.events.onTransportConnect?.({
          transportId: transport.id,
          dtlsParameters,
        })
        callback()
      } catch (error) {
        errback(error instanceof Error ? error : new Error(String(error)))
      }
    })

    transport.on('connectionstatechange', (state) => {
      if (state === 'failed' || state === 'closed') {
        this.setConnectionState('failed')
      }
    })

    this.recvTransport = transport
  }

  private async produceAudio(): Promise<void> {
    if (!this.sendTransport || !this.config) return

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    const track = stream.getAudioTracks()[0]
    if (!track) throw new Error('No audio track')

    const producer = await this.sendTransport.produce({
      track,
      encodings: [{ maxBitrate: 64000 }],
      codecOptions: { opusStereo: true, opusDtx: true },
      appData: { ...this.config.appData, source: 'microphone', keyId: this.localKeyId },
    })

    this.localProducers.set('audio', producer)
    this.setupProducerEvents(producer, 'audio')

    this.onLocalMediaStarted?.(stream)
  }

  private async produceVideo(): Promise<void> {
    if (!this.sendTransport || !this.config) return

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    })
    const track = stream.getVideoTracks()[0]
    if (!track) throw new Error('No video track')

    const producer = await this.sendTransport.produce({
      track,
      encodings: [
        { maxBitrate: 3000000, scaleResolutionDownBy: 1 },
        { maxBitrate: 1500000, scaleResolutionDownBy: 2 },
        { maxBitrate: 500000, scaleResolutionDownBy: 4 },
      ],
      codecOptions: { videoGoogleStartBitrate: 1000 },
      appData: { ...this.config.appData, source: 'camera', keyId: this.localKeyId },
    })

    this.localProducers.set('video', producer)
    this.setupProducerEvents(producer, 'video')

    this.onLocalMediaStarted?.(stream)
  }

  private setupProducerEvents(producer: Producer, kind: 'audio' | 'video' | 'screen'): void {
    producer.on('trackended', () => {
      this.localProducers.delete(kind)
      this.onLocalMediaStopped?.(kind as 'audio' | 'video')
      this.emitStateChange()
    })

    producer.on('transportclose', () => {
      this.localProducers.delete(kind)
      this.emitStateChange()
    })
  }

  async handleNewRemoteProducer(producerId: string, producerUserId: string, kind: 'audio' | 'video' | 'screen'): Promise<void> {
    if (!this.recvTransport || !this.device) return

    try {
      const consumer = await this.recvTransport.consume({
        producerId,
      })

      this.remoteConsumers.set(`${producerUserId}:${kind}`, consumer)

      const track = consumer.track
      this.onRemoteTrackReceived?.(producerUserId, track, kind)

      consumer.on('transportclose', () => {
        this.remoteConsumers.delete(`${producerUserId}:${kind}`)
        this.onRemoteTrackRemoved?.(producerUserId, kind)
        this.emitStateChange()
      })

      consumer.on('trackended', () => {
        this.remoteConsumers.delete(`${producerUserId}:${kind}`)
        this.onRemoteTrackRemoved?.(producerUserId, kind)
        this.emitStateChange()
      })

      this.emitStateChange()
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error('Failed to consume remote producer'))
    }
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      this.collectStats()
    }, 1000)
  }

  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
  }

  private async collectStats(): Promise<void> {
    if (!this.device) return

    try {
      // Note: mediasoup-client Device.getStats() may not be available in all versions
      // This is a placeholder for stats collection
      this.config?.events.onStats?.({})
    } catch {
      // Ignore stats errors
    }
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state
    this.onConnectionStateChange?.(state)
  }

  private setPhase(phase: GroupCallPhase): void {
    if (this.config) {
      this.config.events.onPhaseChange?.(phase)
    }
  }

  private emitStateChange(): void {
    if (!this.config) return
    const state = this.getState()
    this.onStateChange?.(state)
  }

  getState(): GroupCallState {
    const participants = new Map<string, GroupCallParticipant>()

    if (this.config) {
      participants.set(this.config.userId, {
        userId: this.config.userId,
        displayName: this.config.displayName,
        avatarUrl: this.config.avatarUrl,
        role: this.config.isCreator ? 'creator' : 'participant',
        isMuted: this.localProducers.get('audio')?.paused ?? false,
        isCameraOn: this.localProducers.has('video') && !this.localProducers.get('video')?.paused,
        isScreenSharing: this.localProducers.has('screen'),
        isSpeaking: false,
        audioLevel: 0,
        joinedAt: new Date(),
        sframeKeyId: this.localKeyId,
      })
    }

    for (const [key, consumer] of this.remoteConsumers) {
      const [userId, kind] = key.split(':') as [string, string]
      if (!participants.has(userId)) {
        participants.set(userId, {
          userId,
          displayName: '',
          avatarUrl: null,
          role: 'participant',
          isMuted: false,
          isCameraOn: false,
          isScreenSharing: kind === 'screen',
          isSpeaking: false,
          audioLevel: 0,
          joinedAt: new Date(),
        })
      }
      const participant = participants.get(userId)!
      if (kind === 'audio') participant.isMuted = consumer.paused
      if (kind === 'video') participant.isCameraOn = !consumer.paused
      if (kind === 'screen') participant.isScreenSharing = true
    }

    const callId = this.config?.callId || ''
    const channelId = this.config?.channelId || 0
    const mode = this.config?.mode || 'audio'
    const creatorId = this.config?.userId || ''
    const localUserId = this.config?.userId || ''

    return {
      callId,
      channelId,
      mode: this.config?.mode || 'audio',
      phase: this.getPhase(),
      creatorId,
      participants,
      localParticipant: participants.get(localUserId) || null,
      createdAt: new Date(),
      startedAt: this.joined ? new Date() : null,
      endedAt: null,
      sframeKeys: this.sframeKeys,
      localKeyId: this.localKeyId,
    }
  }

  private getPhase(): GroupCallPhase {
    if (!this.joined) return 'idle'
    if (this.connectionState === 'connecting') return 'connecting'
    if (this.connectionState === 'connected') return 'joined'
    if (this.connectionState === 'disconnected') return 'ended'
    return 'idle'
  }

  isJoined(): boolean {
    return this.joined
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  getLocalKeyId(): number {
    return this.localKeyId
  }

  getSFrameKeys(): Map<number, SFrameKey> {
    return this.sframeKeys
  }

  getMLSGroup(): MLSGroup | null {
    return this.mlsGroup
  }

  encryptRtpPacket(packet: Uint8Array, keyId?: number): Uint8Array {
    const kId = keyId ?? this.localKeyId
    const sframeKey = this.sframeKeys.get(kId)
    if (!sframeKey) return packet

    const encryptor = new SFrameEncryptor(sframeKey.key, kId)
    return encryptor.encrypt(packet)
  }

  decryptRtpPacket(packet: Uint8Array, keyId: number): Uint8Array {
    const sframeKey = this.sframeKeys.get(keyId)
    if (!sframeKey) return packet

    const decryptor = new SFrameDecryptor(sframeKey.key, keyId)
    return decryptor.decrypt(packet)
  }

  async saveGroupState(mlsGroupStore: any): Promise<void> {
    if (!this.mlsGroup) return
    await mlsGroupStore.saveGroup(this.mlsGroup)
  }

  async restoreGroupState(mlsGroupStore: any, groupId: string): Promise<void> {
    const group = await mlsGroupStore.getGroup(groupId)
    if (group) {
      this.mlsGroup = group
      this.sframeKeys = await MLSGroupManager.deriveSFrameKeys(group)
      if (this.mlsGroup.members.has(this.config?.userId || '')) {
        const member = this.mlsGroup.members.get(this.config!.userId!)
        if (member) {
          this.localKeyId = member.index
        }
      }
      for (const producer of this.localProducers.values()) {
        producer.appData = { ...producer.appData, keyId: this.localKeyId }
      }
    }
  }

  private async getIdentityKeys(): Promise<{ identityKey: Uint8Array }> {
    return {
      identityKey: new Uint8Array(32),
    }
  }
}

export function createGroupCallEngine(config: GroupCallEngineConfig): GroupCallEngine {
  const engine = new GroupCallEngine()
  Object.assign(engine, {
    onStateChange: config.events.onStateChange,
    onParticipantJoined: config.events.onParticipantJoined,
    onParticipantLeft: config.events.onParticipantLeft,
    onParticipantUpdated: config.events.onParticipantUpdated,
    onLocalMediaStarted: config.events.onLocalMediaStarted,
    onLocalMediaStopped: config.events.onLocalMediaStopped,
    onRemoteTrackReceived: config.events.onRemoteTrackReceived,
    onRemoteTrackRemoved: config.events.onRemoteTrackRemoved,
    onError: config.events.onError,
    onConnectionStateChange: config.events.onConnectionStateChange,
  })
  return engine
}