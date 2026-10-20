import { IdentityKeyPair, PreKeyPair, SignedPreKeyPair } from './x3dh'

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

function jsonParse<T>(data: string | null): T | null {
  if (!data) return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
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

export function createWebStores(): {
  identity: IdentityKeyStore
  preKey: PreKeyStore
  session: SessionStore
} {
  return {
    identity: new WebIdentityKeyStore(),
    preKey: new WebPreKeyStore(),
    session: new WebSessionStore(),
  }
}