import { IdentityKeyPair, PreKeyPair, SignedPreKeyPair } from './x3dh'
import type { MLSGroup, MLSMember, Credential } from '../groupCall/mls'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

export interface IdentityKeyStore {
  getIdentityKeyPair(): Promise<IdentityKeyPair | null>
  saveIdentityKeyPair(keyPair: IdentityKeyPair): Promise<void>
  rotateIdentityKeyPair(newKeyPair: IdentityKeyPair): Promise<void>
}

export interface PreKeyStore {
  getSignedPreKey(): Promise<SignedPreKeyPair | null>
  saveSignedPreKey(keyPair: SignedPreKeyPair): Promise<void>
  getPreKey(keyId: number): Promise<PreKeyPair | null>
  savePreKey(keyPair: PreKeyPair): Promise<void>
  removePreKey(keyId: number): Promise<void>
  getAllPreKeys(): Promise<PreKeyPair[]>
  savePreKeys(keyPairs: PreKeyPair[]): Promise<void>
}

export interface SessionStore {
  getSession(callId: string): Promise<string | null>
  saveSession(callId: string, session: string): Promise<void>
  removeSession(callId: string): Promise<void>
}

export interface MLSGroupStore {
  getGroup(groupId: string): Promise<MLSGroup | null>
  saveGroup(group: MLSGroup): Promise<void>
  removeGroup(groupId: string): Promise<void>
  getAllGroups(): Promise<MLSGroup[]>
}

export interface MLSIdentityStore {
  getIdentityExport(): Promise<Uint8Array | null>
  saveIdentityExport(exportBytes: Uint8Array): Promise<void>
}

function jsonParse<T>(data: string | null): T | null {
  if (!data) return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

function arrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
}

function base64ToArray(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function serializeMLSGroup(group: MLSGroup): string {
  return JSON.stringify({
    groupId: group.groupId,
    epoch: group.epoch,
    members: Array.from(group.members.entries()).map(([userId, member]) => [
      userId,
      {
        userId: member.userId,
        index: member.index,
        credential: {
          credentialType: member.credential.credentialType,
          identity: member.credential.identity,
          signatureKey: arrayToBase64(member.credential.signatureKey),
        },
        signatureKey: arrayToBase64(member.signatureKey),
        encryptionKey: arrayToBase64(member.encryptionKey),
      },
    ]),
    exportSecret: arrayToBase64(group.exportSecret),
  })
}

function deserializeMLSGroup(data: string): MLSGroup {
  const parsed = JSON.parse(data)
  const members = new Map<string, MLSMember>()
  for (const [userId, member] of parsed.members) {
    members.set(userId, {
      userId: member.userId,
      index: member.index,
      credential: {
        credentialType: member.credential.credentialType,
        identity: member.credential.identity,
        signatureKey: base64ToArray(member.credential.signatureKey),
      },
      signatureKey: base64ToArray(member.signatureKey),
      encryptionKey: base64ToArray(member.encryptionKey),
    })
  }
  return {
    groupId: parsed.groupId,
    epoch: parsed.epoch,
    members,
    exportSecret: base64ToArray(parsed.exportSecret),
  }
}

function arrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
}

function base64ToArray(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export class RNIdentityKeyStore implements IdentityKeyStore {
  private static KEY = 'messenger_identity_key_pair'

  async getIdentityKeyPair(): Promise<IdentityKeyPair | null> {
    const data = await SecureStore.getItemAsync(RNIdentityKeyStore.KEY)
    return jsonParse<IdentityKeyPair>(data)
  }

  async saveIdentityKeyPair(keyPair: IdentityKeyPair): Promise<void> {
    await SecureStore.setItemAsync(RNIdentityKeyStore.KEY, JSON.stringify(keyPair))
  }

  async rotateIdentityKeyPair(newKeyPair: IdentityKeyPair): Promise<void> {
    await this.saveIdentityKeyPair(newKeyPair)
  }
}

export class RNPreKeyStore implements PreKeyStore {
  private static SIGNED_PRE_KEY = 'messenger_signed_pre_key'
  private static PRE_KEYS = 'messenger_pre_keys'

  async getSignedPreKey(): Promise<SignedPreKeyPair | null> {
    const data = await SecureStore.getItemAsync(RNPreKeyStore.SIGNED_PRE_KEY)
    return jsonParse<SignedPreKeyPair>(data)
  }

  async saveSignedPreKey(keyPair: SignedPreKeyPair): Promise<void> {
    await SecureStore.setItemAsync(RNPreKeyStore.SIGNED_PRE_KEY, JSON.stringify(keyPair))
  }

  async getPreKey(keyId: number): Promise<PreKeyPair | null> {
    const all = await this.getAllPreKeys()
    return all.find(k => k.keyId === keyId) || null
  }

  async savePreKey(keyPair: PreKeyPair): Promise<void> {
    const all = await this.getAllPreKeys()
    const filtered = all.filter(k => k.keyId !== keyPair.keyId)
    filtered.push(keyPair)
    await this.savePreKeys(filtered)
  }

  async removePreKey(keyId: number): Promise<void> {
    const all = await this.getAllPreKeys()
    const filtered = all.filter(k => k.keyId !== keyId)
    await this.savePreKeys(filtered)
  }

  async getAllPreKeys(): Promise<PreKeyPair[]> {
    const data = await SecureStore.getItemAsync(RNPreKeyStore.PRE_KEYS)
    return jsonParse<PreKeyPair[]>(data) || []
  }

  async savePreKeys(keyPairs: PreKeyPair[]): Promise<void> {
    await SecureStore.setItemAsync(RNPreKeyStore.PRE_KEYS, JSON.stringify(keyPairs))
  }
}

export class RNSessionStore implements SessionStore {
  private static PREFIX = 'messenger_e2ee_session_'

  async getSession(callId: string): Promise<string | null> {
    return SecureStore.getItemAsync(`${RNSessionStore.PREFIX}${callId}`)
  }

  async saveSession(callId: string, session: string): Promise<void> {
    await SecureStore.setItemAsync(`${RNSessionStore.PREFIX}${callId}`, session)
  }

  async removeSession(callId: string): Promise<void> {
    await SecureStore.deleteItemAsync(`${RNSessionStore.PREFIX}${callId}`)
  }
}

export class RNMLSGroupStore implements MLSGroupStore {
  private static PREFIX = 'messenger_mls_group_'

  async getGroup(groupId: string): Promise<MLSGroup | null> {
    const data = await AsyncStorage.getItem(`${RNMLSGroupStore.PREFIX}${groupId}`)
    if (!data) return null
    return deserializeMLSGroup(data)
  }

  async saveGroup(group: MLSGroup): Promise<void> {
    await AsyncStorage.setItem(`${RNMLSGroupStore.PREFIX}${group.groupId}`, serializeMLSGroup(group))
  }

  async removeGroup(groupId: string): Promise<void> {
    await AsyncStorage.removeItem(`${RNMLSGroupStore.PREFIX}${groupId}`)
  }

  async getAllGroups(): Promise<MLSGroup[]> {
    const keys = await AsyncStorage.getAllKeys()
    const groups: MLSGroup[] = []
    for (const key of keys) {
      if (key.startsWith(RNMLSGroupStore.PREFIX)) {
        const data = await AsyncStorage.getItem(key)
        if (data) {
          try {
            groups.push(deserializeMLSGroup(data))
          } catch {}
        }
      }
    }
    return groups
  }
}

export class RNMLSIdentityStore implements MLSIdentityStore {
  private static KEY = 'messenger_mls_identity_export'

  async getIdentityExport(): Promise<Uint8Array | null> {
    const data = await SecureStore.getItemAsync(RNMLSIdentityStore.KEY)
    if (!data) return null
    return base64ToArray(data)
  }

  async saveIdentityExport(exportBytes: Uint8Array): Promise<void> {
    await SecureStore.setItemAsync(RNMLSIdentityStore.KEY, arrayToBase64(exportBytes))
  }
}

export function createRNStores(): {
  identity: IdentityKeyStore
  preKey: PreKeyStore
  session: SessionStore
  mlsGroup: MLSGroupStore
  mlsIdentity: MLSIdentityStore
} {
  return {
    identity: new RNIdentityKeyStore(),
    preKey: new RNPreKeyStore(),
    session: new RNSessionStore(),
    mlsGroup: new RNMLSGroupStore(),
    mlsIdentity: new RNMLSIdentityStore(),
  }
}