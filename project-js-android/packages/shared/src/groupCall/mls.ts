import { hkdfSHA256, concatBytes } from '../crypto/hkdf'
import type { SFrameKey } from './types'

export interface MLSGroup {
  groupId: string
  epoch: number
  members: Map<string, MLSMember>
  exportSecret: Uint8Array
}

export interface MLSMember {
  userId: string
  index: number
  credential: Credential
  signatureKey: Uint8Array
  encryptionKey: Uint8Array
}

export interface Credential {
  credentialType: 'basic' | 'x509'
  identity: string
  signatureKey: Uint8Array
}

export interface MLSWelcome {
  groupId: string
  epoch: number
  secrets: Uint8Array
  welcomeEnvelope: any
}

export interface MLSCommit {
  proposerIndex: number
  proposals: MLSProposal[]
  path: MLSPathNode[]
  confirmationTag: Uint8Array
}

export interface MLSProposal {
  proposalType: 'add' | 'remove' | 'update'
  add?: { userId: string; keyPackage: Uint8Array }
  remove?: { removedIndex: number }
  update?: { keyPackage: Uint8Array }
}

export interface MLSKeyPackage {
  hpkeInitKey: Uint8Array
  leafNode: MLSLeafNode
}

export interface MLSLeafNode {
  credential: Credential
  capabilities: MLSCapabilities
  leafNodeSource: 'keyPackage' | 'update' | 'commit'
  encryptionKey: Uint8Array
  signatureKey: Uint8Array
}

export interface MLSCapabilities {
  versions: string[]
  cipherSuites: string[]
  extensions: string[]
  proposals: string[]
  credentials: string[]
}

export interface MLSPathNode {
  encryptionKey: Uint8Array
  parentHash: Uint8Array
  unmergedLeaves: number[]
}

let MessagingClient: any = null
let IndexedDbStorage: any = null
let WebSocketTransport: any = null

async function loadSDK(): Promise<void> {
  if (MessagingClient) return
  try {
    const sdk = await import('ping-openmls-sdk')
    MessagingClient = sdk.MessagingClient
    IndexedDbStorage = sdk.IndexedDbStorage
    WebSocketTransport = sdk.WebSocketTransport
  } catch (error) {
    console.warn('ping-openmls-sdk not available, using fallback implementation:', error)
  }
}

export class MLSGroupManager {
  private static GROUP_ID_PREFIX = 'messenger-group-call-'
  private static SFRAME_LABEL = 'sframe'
  private static client: any = null
  private static storage: any = null

  static generateGroupId(channelId: number): string {
    return `${MLSGroupManager.GROUP_ID_PREFIX}${channelId}-${Date.now()}`
  }

  static async initializeClient(
    identityExport: Uint8Array,
    deviceLabel: string = 'group-call-device'
  ): Promise<any> {
    await loadSDK()
    
    if (!MessagingClient) {
      throw new Error('MLS SDK not available')
    }

    if (MLSGroupManager.client) {
      return MLSGroupManager.client
    }

    if (typeof window === 'undefined') {
      throw new Error('MLS client requires browser environment')
    }

    MLSGroupManager.storage = new IndexedDbStorage('messenger-mls')
    
    const transport = new WebSocketTransport({
      url: 'wss://your-signaling-server.com/ws',
      onOpen: () => console.log('MLS transport connected'),
      onClose: () => console.log('MLS transport closed'),
    })

    MLSGroupManager.client = await MessagingClient.init({
      identityExport,
      deviceLabel,
      storage: MLSGroupManager.storage,
      transport,
    })

    return MLSGroupManager.client
  }

  static async createCallGroup(
    creatorUserId: string,
    channelId: number,
    identityExport: Uint8Array
  ): Promise<{ group: MLSGroup; welcome: MLSWelcome; conversationId: string }> {
    const client = await MLSGroupManager.initializeClient(identityExport)
    
    const conversation = await client.createCallConversation({
      name: `group-call-${channelId}`,
    })

    const meta = conversation.meta()
    const members = await conversation.members()
    
    const membersMap = new Map<string, MLSMember>()
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

    const exportSecret = await conversation.exportConversationSecret(
      'sframe',
      new TextEncoder().encode('sframe'),
      32
    )

    const group: MLSGroup = {
      groupId: meta.id,
      epoch: meta.epoch,
      members: membersMap,
      exportSecret,
    }

    return {
      group,
      welcome: {
        groupId: meta.id,
        epoch: meta.epoch,
        secrets: exportSecret,
        welcomeEnvelope: null,
      },
      conversationId: meta.id,
    }
  }

  static async processWelcome(
    welcomeEnvelope: any,
    identityExport: Uint8Array
  ): Promise<{ group: MLSGroup; conversationId: string }> {
    const client = await MLSGroupManager.initializeClient(identityExport)
    
    const conversation = await client.joinConversation(welcomeEnvelope)
    const meta = conversation.meta()
    const members = await conversation.members()
    
    const membersMap = new Map<string, MLSMember>()
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

    const exportSecret = await conversation.exportConversationSecret(
      'sframe',
      new TextEncoder().encode('sframe'),
      32
    )

    const group: MLSGroup = {
      groupId: meta.id,
      epoch: meta.epoch,
      members: membersMap,
      exportSecret,
    }

    return { group, conversationId: meta.id }
  }

  static async processCommit(
    group: MLSGroup,
    conversationId: string
  ): Promise<MLSGroup> {
    const client = MLSGroupManager.client
    if (!client) throw new Error('MLS client not initialized')

    const conversation = client.getConversation(conversationId)
    await conversation.syncConversation()
    
    const meta = conversation.meta()
    const members = await conversation.members()
    const exportSecret = await conversation.exportConversationSecret(
      'sframe',
      new TextEncoder().encode('sframe'),
      32
    )

    const membersMap = new Map<string, MLSMember>()
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

    return {
      ...group,
      groupId: meta.id,
      epoch: meta.epoch,
      members: membersMap,
      exportSecret,
    }
  }

  static async addMember(
    conversationId: string,
    memberUserId: string,
    keyPackage: Uint8Array
  ): Promise<void> {
    const client = MLSGroupManager.client
    if (!client) throw new Error('MLS client not initialized')

    const conversation = client.getConversation(conversationId)
    await conversation.addMembers([{ device_id: new Uint8Array(16), key_package: keyPackage }])
  }

  static async removeMember(
    conversationId: string,
    leafIndex: number
  ): Promise<void> {
    const client = MLSGroupManager.client
    if (!client) throw new Error('MLS client not initialized')

    const conversation = client.getConversation(conversationId)
    await conversation.removeMembers([leafIndex])
  }

  static async deriveSFrameKeys(group: MLSGroup): Promise<Map<number, SFrameKey>> {
    const keys = new Map<number, SFrameKey>()
    const senderCount = group.members.size

    for (let i = 0; i < senderCount; i++) {
      const keyId = i
      const baseKey = await MLSGroupManager.deriveKey(group.exportSecret, keyId)
      const salt = await MLSGroupManager.deriveSalt(group.exportSecret, keyId)
      
      keys.set(keyId, {
        keyId,
        key: baseKey,
        salt,
      })
    }

    return keys
  }

  static async deriveKey(exportSecret: Uint8Array, keyId: number): Promise<Uint8Array> {
    const keyIdBytes = new Uint8Array(4)
    new DataView(keyIdBytes.buffer).setUint32(0, keyId, false)
    const info = concatBytes(new TextEncoder().encode(MLSGroupManager.SFRAME_LABEL), keyIdBytes)
    return hkdfSHA256(new Uint8Array(32), exportSecret, info, 16)
  }

  private static async deriveSalt(exportSecret: Uint8Array, keyId: number): Promise<Uint8Array> {
    const keyIdBytes = new Uint8Array(4)
    new DataView(keyIdBytes.buffer).setUint32(0, keyId, false)
    const info = concatBytes(new TextEncoder().encode(MLSGroupManager.SFRAME_LABEL), keyIdBytes)
    return hkdfSHA256(new Uint8Array(32), exportSecret, info, 16)
  }

  static async encryptFrame(
    key: Uint8Array,
    salt: Uint8Array,
    counter: number,
    plaintext: Uint8Array
  ): Promise<Uint8Array> {
    const { gcm } = await import('@noble/ciphers/aes')
    const nonce = MLSGroupManager.deriveNonce(salt, counter)
    const cipher = gcm(key, nonce)
    return cipher.encrypt(plaintext)
  }

  static async decryptFrame(
    key: Uint8Array,
    salt: Uint8Array,
    counter: number,
    ciphertext: Uint8Array
  ): Promise<Uint8Array> {
    const { gcm } = await import('@noble/ciphers/aes')
    const nonce = MLSGroupManager.deriveNonce(salt, counter)
    const cipher = gcm(key, nonce)
    return cipher.decrypt(ciphertext)
  }

  private static deriveNonce(salt: Uint8Array, counter: number): Uint8Array {
    const nonce = new Uint8Array(12)
    const counterBytes = new Uint8Array(8)
    new DataView(counterBytes.buffer).setBigUint64(0, BigInt(counter), false)
    for (let i = 0; i < 12; i++) {
      const saltByte = salt[i % salt.length]
      const counterByte = counterBytes[i % 8]
      nonce[i] = (saltByte ?? 0) ^ (counterByte ?? 0)
    }
    return nonce
  }
}

export async function initializeMLSClient(
  identityExport: Uint8Array,
  deviceLabel?: string
): Promise<any> {
  return MLSGroupManager.initializeClient(identityExport, deviceLabel)
}

export async function createGroupCallMLSGroup(
  creatorUserId: string,
  channelId: number,
  identityExport: Uint8Array
): Promise<{ group: MLSGroup; welcome: MLSWelcome; conversationId: string }> {
  return MLSGroupManager.createCallGroup(creatorUserId, channelId, identityExport)
}

export async function joinGroupCallFromWelcome(
  welcomeEnvelope: any,
  identityExport: Uint8Array
): Promise<{ group: MLSGroup; conversationId: string }> {
  return MLSGroupManager.processWelcome(welcomeEnvelope, identityExport)
}

export async function processGroupCallCommit(
  group: MLSGroup,
  conversationId: string
): Promise<MLSGroup> {
  return MLSGroupManager.processCommit(group, conversationId)
}

export async function addGroupCallMember(
  conversationId: string,
  memberUserId: string,
  keyPackage: Uint8Array
): Promise<void> {
  return MLSGroupManager.addMember(conversationId, memberUserId, keyPackage)
}

export async function removeGroupCallMember(
  conversationId: string,
  leafIndex: number
): Promise<void> {
  return MLSGroupManager.removeMember(conversationId, leafIndex)
}

export async function deriveGroupCallSFrameKeys(
  group: MLSGroup
): Promise<Map<number, SFrameKey>> {
  return MLSGroupManager.deriveSFrameKeys(group)
}