import { Device } from 'mediasoup-client'
import type { Producer, Consumer, Transport } from 'mediasoup-client/types'
import type {
  GroupCallEngineConfig,
  GroupCallEngineEvents,
  GroupCallState,
  GroupCallParticipant,
  GroupCallPhase,
  ConnectionState,
  SFrameKey,
} from '../groupCall/types'
import { saveGroupCallState } from './persistence'

declare global {
  interface Window {
    mlsClient: any
  }
}

export class GroupCallEngine {
  private device: Device | null = null
  private sendTransport: Transport | null = null
  private recvTransport: Transport | null = null
  private localProducers: Map<string, Producer> = new Map()
  private remoteConsumers: Map<string, Consumer> = new Map()
  private sframeKeys: Map<number, SFrameKey> = new Map()
  private localKeyId: number = 0
  private mlsGroup: any = null
  private conversationId: string | null = null
  private config: GroupCallEngineConfig | null = null
  private joined = false
  private connectionState: ConnectionState = 'new'

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

      this.emitStateChange()
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  async leave(): Promise<void> {
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

  async initializeSFrameKeys(mlsGroup: any): Promise<void> {
    this.mlsGroup = mlsGroup
    this.sframeKeys = await this.deriveSFrameKeys(mlsGroup)

    if (this.mlsGroup.members.has(this.config?.userId || '')) {
      const member = this.mlsGroup.members.get(this.config!.userId!)
      if (member) {
        this.localKeyId = member.index
      }
    }

    for (const producer of this.localProducers.values()) {
      producer.appData = { ...producer.appData, keyId: this.localKeyId }
    }

    if (this.config) {
      saveGroupCallState({
        callId: this.config.callId,
        channelId: this.config.channelId,
        mode: this.config.mode,
        groupId: this.mlsGroup.groupId,
        epoch: this.mlsGroup.epoch,
        localKeyId: this.localKeyId,
        savedAt: new Date().toISOString(),
      })
    }
  }

  async processWelcome(welcomeEnvelope: any): Promise<void> {
    if (!this.config) return
    // In web, we use ping-openmls-sdk
    const client = window.mlsClient
    if (!client) throw new Error('MLS client not initialized')

    const conversation = await client.joinConversation(welcomeEnvelope)
    const meta = conversation.meta()
    const members = await conversation.members()
    const exportSecret = await conversation.exportConversationSecret('sframe', new TextEncoder().encode('sframe'), 32)

    const membersMap = new Map()
    for (const member of members) {
      membersMap.set(member.user_id, {
        userId: member.user_id,
        index: member.leaf_index,
        credential: {
          credentialType: 'basic',
          identity: member.user_id,
          signatureKey: member.signature_key,
        },
        signatureKey: member.signature_key,
        encryptionKey: member.encryption_key,
      })
    }

    this.mlsGroup = {
      groupId: meta.id,
      epoch: meta.epoch,
      members: membersMap,
      exportSecret,
    }
    this.conversationId = meta.id

    await this.initializeSFrameKeys(this.mlsGroup)
  }

  async processCommit(): Promise<void> {
    if (!this.mlsGroup || !this.conversationId) return
    const client = window.mlsClient
    if (!client) throw new Error('MLS client not initialized')

    const conversation = client.getConversation(this.conversationId)
    await conversation.syncConversation()

    const meta = conversation.meta()
    const members = await conversation.members()
    const exportSecret = await conversation.exportConversationSecret('sframe', new TextEncoder().encode('sframe'), 32)

    const membersMap = new Map()
    for (const member of members) {
      membersMap.set(member.user_id, {
        userId: member.user_id,
        index: member.leaf_index,
        credential: {
          credentialType: 'basic',
          identity: member.user_id,
          signatureKey: member.signature_key,
        },
        signatureKey: member.signature_key,
        encryptionKey: member.encryption_key,
      })
    }

    this.mlsGroup = {
      ...this.mlsGroup,
      groupId: meta.id,
      epoch: meta.epoch,
      members: membersMap,
      exportSecret,
    }
    this.sframeKeys = await this.deriveSFrameKeys(this.mlsGroup)
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
    const params = this.config?.sendTransport
    if (!params) throw new Error('Send transport parameters are missing')

    const transport = this.device.createSendTransport({
      id: params.id,
      iceParameters: params.iceParameters,
      iceCandidates: params.iceCandidates,
      dtlsParameters: params.dtlsParameters,
      iceServers,
      iceTransportPolicy: 'all',
    })

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
    const params = this.config?.recvTransport
    if (!params) throw new Error('Receive transport parameters are missing')

    const transport = this.device.createRecvTransport({
      id: params.id,
      iceParameters: params.iceParameters,
      iceCandidates: params.iceCandidates,
      dtlsParameters: params.dtlsParameters,
      iceServers,
      iceTransportPolicy: 'all',
    })

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
    if (!this.config?.events.onConsume) return
    if (this.remoteConsumers.has(`${producerUserId}:${kind}`)) return

    try {
      const consumerParams = await this.config.events.onConsume({
        producerId,
        kind: kind === 'screen' ? 'video' : kind,
        rtpCapabilities: this.device.rtpCapabilities,
      })
      if (!consumerParams) return

      const consumer = await this.recvTransport.consume({
        id: consumerParams.consumerId,
        producerId,
        kind: consumerParams.kind,
        rtpParameters: consumerParams.rtpParameters,
        appData: { userId: producerUserId, source: kind },
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

  async consumeExistingProducers(
    producers: Array<{ producerId: string; producerUserId: string; kind: 'audio' | 'video'; appData?: Record<string, unknown> }>,
  ): Promise<void> {
    for (const producer of producers) {
      const source = producer.appData?.source
      const kind = source === 'screen' ? 'screen' : producer.kind
      await this.handleNewRemoteProducer(producer.producerId, producer.producerUserId, kind)
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
      const [userId, kind] = key.split(':')
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

    return {
      callId: this.config?.callId || '',
      channelId: this.config?.channelId || 0,
      mode: this.config?.mode || 'audio',
      phase: this.getPhase(),
      creatorId: this.config?.userId || '',
      participants,
      localParticipant: participants.get(this.config?.userId || '') || null,
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

  getMLSGroup(): any {
    return this.mlsGroup
  }

  private async deriveSFrameKeys(group: any): Promise<Map<number, SFrameKey>> {
    const keys = new Map<number, SFrameKey>()
    const senderCount = group.members.size

    for (let i = 0; i < senderCount; i++) {
      const keyId = i
      const baseKey = await this.deriveKey(group.exportSecret, keyId)
      const salt = await this.deriveSalt(group.exportSecret, keyId)
      
      keys.set(keyId, {
        keyId,
        key: baseKey,
        salt,
      })
    }

    return keys
  }

  private async deriveKey(exportSecret: Uint8Array, keyId: number): Promise<Uint8Array> {
    const keyIdBytes = new Uint8Array(4)
    new DataView(keyIdBytes.buffer).setUint32(0, keyId, false)
    const info = new TextEncoder().encode('sframe')
    const concat = new Uint8Array(info.length + keyIdBytes.length)
    concat.set(info)
    concat.set(keyIdBytes, info.length)
    const { hkdfSHA256 } = await import('../crypto/hkdf')
    return hkdfSHA256(new Uint8Array(32), exportSecret, concat, 16)
  }

  private async deriveSalt(exportSecret: Uint8Array, keyId: number): Promise<Uint8Array> {
    const keyIdBytes = new Uint8Array(4)
    new DataView(keyIdBytes.buffer).setUint32(0, keyId, false)
    const info = new TextEncoder().encode('sframe')
    const concat = new Uint8Array(info.length + keyIdBytes.length)
    concat.set(info)
    concat.set(keyIdBytes, info.length)
    const { hkdfSHA256 } = await import('../crypto/hkdf')
    return hkdfSHA256(new Uint8Array(32), exportSecret, concat, 16)
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

const CreateGroupCallEngineConfigParams = {
  callId: '' as string,
  channelId: 0 as number,
  mode: 'audio' as 'audio' | 'video',
  userId: '' as string,
  displayName: '' as string,
  avatarUrl: null as string | null,
  isCreator: false as boolean,
  rtpCapabilities: null as any,
  iceServers: [] as RTCIceServer[],
  userIdString: '' as string,
  sendTransport: null as GroupCallEngineConfig['sendTransport'],
  recvTransport: null as GroupCallEngineConfig['recvTransport'],
  events: {} as Partial<GroupCallEngineEvents>,
} as const

type CreateGroupCallEngineConfigParams = typeof CreateGroupCallEngineConfigParams

export function createGroupCallEngineConfig(params: CreateGroupCallEngineConfigParams) {
  const appData = { userId: params.userIdString, isScreenShare: false, source: 'group-call', keyId: 0 }
  
  return {
    callId: params.callId,
    channelId: params.channelId,
    mode: params.mode,
    userId: params.userId,
    displayName: params.displayName,
    avatarUrl: params.avatarUrl,
    isCreator: params.isCreator,
    rtpCapabilities: params.rtpCapabilities,
    iceServers: params.iceServers,
    sendTransport: params.sendTransport,
    recvTransport: params.recvTransport,
    appData,
    events: params.events,
  } as GroupCallEngineConfig
}
