import { IdentityKeyPair, PreKeyPair, SignedPreKeyPair } from './x3dh'
import type { MLSGroup, MLSMember, Credential } from '../groupCall/mls'

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

export class WebIdentityKeyStore implements IdentityKeyStore {
  private static KEY = 'messenger_identity_key_pair'

  async getIdentityKeyPair(): Promise<IdentityKeyPair | null> {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(WebIdentityKeyStore.KEY)
    return jsonParse<IdentityKeyPair>(data)
  }

  async saveIdentityKeyPair(keyPair: IdentityKeyPair): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(WebIdentityKeyStore.KEY, JSON.stringify(keyPair))
  }

  async rotateIdentityKeyPair(newKeyPair: IdentityKeyPair): Promise<void> {
    await this.saveIdentityKeyPair(newKeyPair)
  }
}

export class WebPreKeyStore implements PreKeyStore {
  private static SIGNED_PRE_KEY = 'messenger_signed_pre_key'
  private static PRE_KEYS = 'messenger_pre_keys'

  async getSignedPreKey(): Promise<SignedPreKeyPair | null> {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(WebPreKeyStore.SIGNED_PRE_KEY)
    return jsonParse<SignedPreKeyPair>(data)
  }

  async saveSignedPreKey(keyPair: SignedPreKeyPair): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(WebPreKeyStore.SIGNED_PRE_KEY, JSON.stringify(keyPair))
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
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(WebPreKeyStore.PRE_KEYS)
    return jsonParse<PreKeyPair[]>(data) || []
  }

  async savePreKeys(keyPairs: PreKeyPair[]): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(WebPreKeyStore.PRE_KEYS, JSON.stringify(keyPairs))
  }
}

export class WebSessionStore implements SessionStore {
  private static PREFIX = 'messenger_e2ee_session_'

  async getSession(callId: string): Promise<string | null> {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`${WebSessionStore.PREFIX}${callId}`)
  }

  async saveSession(callId: string, session: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${WebSessionStore.PREFIX}${callId}`, session)
  }

  async removeSession(callId: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`${WebSessionStore.PREFIX}${callId}`)
  }
}

export class WebMLSGroupStore implements MLSGroupStore {
  private static PREFIX = 'messenger_mls_group_'

  async getGroup(groupId: string): Promise<MLSGroup | null> {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(`${WebMLSGroupStore.PREFIX}${groupId}`)
    if (!data) return null
    return deserializeMLSGroup(data)
  }

  async saveGroup(group: MLSGroup): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${WebMLSGroupStore.PREFIX}${group.groupId}`, serializeMLSGroup(group))
  }

  async removeGroup(groupId: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`${WebMLSGroupStore.PREFIX}${groupId}`)
  }

  async getAllGroups(): Promise<MLSGroup[]> {
    if (typeof window === 'undefined') return []
    const groups: MLSGroup[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(WebMLSGroupStore.PREFIX)) {
        const data = localStorage.getItem(key)
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

export class WebMLSIdentityStore implements MLSIdentityStore {
  private static KEY = 'messenger_mls_identity_export'

  async getIdentityExport(): Promise<Uint8Array | null> {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(WebMLSIdentityStore.KEY)
    if (!data) return null
    return base64ToArray(data)
  }

  async saveIdentityExport(exportBytes: Uint8Array): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(WebMLSIdentityStore.KEY, arrayToBase64(exportBytes))
  }
}

export function createWebStores(): {
  identity: IdentityKeyStore
  preKey: PreKeyStore
  session: SessionStore
  mlsGroup: MLSGroupStore
  mlsIdentity: MLSIdentityStore
} {
  return {
    identity: new WebIdentityKeyStore(),
    preKey: new WebPreKeyStore(),
    session: new WebSessionStore(),
    mlsGroup: new WebMLSGroupStore(),
    mlsIdentity: new WebMLSIdentityStore(),
  }
}