import { gcm } from '@noble/ciphers/aes'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { concatBytes, hkdfExpand } from './hkdf'

export const SFRAME_KEY_ID_LENGTH = 4
export const SFRAME_COUNTER_LENGTH = 4
export const SFRAME_TAG_LENGTH = 16
export const SFRAME_HEADER_LENGTH = SFRAME_KEY_ID_LENGTH + SFRAME_COUNTER_LENGTH

export function encodeKeyId(keyId: number): Uint8Array {
  const buf = new Uint8Array(SFRAME_KEY_ID_LENGTH)
  new DataView(buf.buffer).setUint32(0, keyId, false)
  return buf
}

export function decodeKeyId(buf: Uint8Array): number {
  return new DataView(buf.buffer).getUint32(0, false)
}

export function encodeCounter(counter: number): Uint8Array {
  const buf = new Uint8Array(SFRAME_COUNTER_LENGTH)
  new DataView(buf.buffer).setUint32(0, counter, false)
  return buf
}

export function decodeCounter(buf: Uint8Array): number {
  return new DataView(buf.buffer).getUint32(0, false)
}

export function deriveKeyAndSalt(baseKey: Uint8Array, keyId: number): { key: Uint8Array; salt: Uint8Array } {
  const keyIdBytes = encodeKeyId(keyId)
  const key = new Uint8Array(16)
  const salt = new Uint8Array(16)
  const keyMaterial = concatBytes(new TextEncoder().encode('sframe'), keyIdBytes)
  const expanded = hkdfExpand(baseKey, keyMaterial, 32)
  key.set(expanded.slice(0, 16))
  salt.set(expanded.slice(16, 32))
  return { key, salt }
}

export function deriveNonce(salt: Uint8Array, counter: number): Uint8Array {
  const counterBytes = encodeCounter(counter)
  const nonce = new Uint8Array(12)
  for (let i = 0; i < 12; i++) {
    const saltByte = salt[i]
    const counterByte = counterBytes[i % 4]
    if (saltByte === undefined || counterByte === undefined) {
      throw new Error('Invalid salt or counter bytes')
    }
    nonce[i] = saltByte ^ counterByte
  }
  return nonce
}

export class SFrameEncryptor {
  private baseKey: Uint8Array
  private keyId: number
  private counter: number

  constructor(baseKey: Uint8Array, keyId: number = 0) {
    this.baseKey = baseKey
    this.keyId = keyId
    this.counter = 0
  }

  setKeyId(keyId: number): void {
    this.keyId = keyId
  }

  getKeyId(): number {
    return this.keyId
  }

  getCounter(): number {
    return this.counter
  }

  encrypt(plaintext: Uint8Array): Uint8Array {
    const { key, salt } = deriveKeyAndSalt(this.baseKey, this.keyId)
    const nonce = deriveNonce(salt, this.counter)
    const cipher = gcm(key, nonce)
    const ciphertext = cipher.encrypt(plaintext)
    const header = concatBytes(encodeKeyId(this.keyId), encodeCounter(this.counter))
    const result = new Uint8Array(header.length + ciphertext.length)
    result.set(header)
    result.set(ciphertext, header.length)
    this.counter++
    return result
  }

  reset(): void {
    this.counter = 0
  }
}

export class SFrameDecryptor {
  private baseKey: Uint8Array
  private keyId: number
  private counter: number
  private replayWindow: Set<number>

  constructor(baseKey: Uint8Array, keyId: number = 0) {
    this.baseKey = baseKey
    this.keyId = keyId
    this.counter = 0
    this.replayWindow = new Set()
  }

  setKeyId(keyId: number): void {
    this.keyId = keyId
  }

  getKeyId(): number {
    return this.keyId
  }

  decrypt(ciphertext: Uint8Array): Uint8Array {
    if (ciphertext.length < SFRAME_HEADER_LENGTH + SFRAME_TAG_LENGTH) {
      throw new Error('Ciphertext too short')
    }
    const header = ciphertext.slice(0, SFRAME_HEADER_LENGTH)
    const keyId = decodeKeyId(header.slice(0, SFRAME_KEY_ID_LENGTH))
    const counter = decodeCounter(header.slice(SFRAME_KEY_ID_LENGTH))
    const actualCiphertext = ciphertext.slice(SFRAME_HEADER_LENGTH)

    if (keyId !== this.keyId) {
      throw new Error(`Key ID mismatch: expected ${this.keyId}, got ${keyId}`)
    }

    const replayKey = (keyId << 32) | counter
    if (this.replayWindow.has(replayKey)) {
      throw new Error('Replay detected')
    }

    const { key, salt } = deriveKeyAndSalt(this.baseKey, keyId)
    const nonce = deriveNonce(salt, counter)
    const cipher = gcm(key, nonce)
    const plaintext = cipher.decrypt(actualCiphertext)

    this.replayWindow.add(replayKey)
    if (this.replayWindow.size > 64) {
      const keys = Array.from(this.replayWindow.keys())
      keys.sort((a, b) => a - b)
      const firstKey = keys[0]
      if (firstKey !== undefined) {
        this.replayWindow.delete(firstKey)
      }
    }

    return plaintext
  }

  reset(): void {
    this.counter = 0
    this.replayWindow.clear()
  }
}