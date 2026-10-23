import { describe, it, expect, beforeEach } from 'vitest'
import {
  SFrameEncryptor,
  SFrameDecryptor,
  deriveKeyAndSalt,
  deriveNonce,
  encodeKeyId,
  decodeKeyId,
  encodeCounter,
  decodeCounter,
  SFRAME_HEADER_LENGTH,
  SFRAME_TAG_LENGTH,
} from './sframe'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

describe('sframe', () => {
  const baseKey = hexToBytes('000102030405060708090a0b0c0d0e0f')
  const keyId = 5
  const plaintext = new TextEncoder().encode('Hello, SFrame!')

  describe('Key ID encoding/decoding', () => {
    it('encodes and decodes keyId correctly', () => {
      const encoded = encodeKeyId(keyId)
      const decoded = decodeKeyId(encoded)
      expect(decoded).toBe(keyId)
    })

    it('handles keyId = 0', () => {
      const encoded = encodeKeyId(0)
      const decoded = decodeKeyId(encoded)
      expect(decoded).toBe(0)
    })

    it('handles max keyId (uint32)', () => {
      const maxKeyId = 0xffffffff
      const encoded = encodeKeyId(maxKeyId)
      const decoded = decodeKeyId(encoded)
      expect(decoded).toBe(maxKeyId)
    })
  })

  describe('Counter encoding/decoding', () => {
    it('encodes and decodes counter correctly', () => {
      const counter = 12345
      const encoded = encodeCounter(counter)
      const decoded = decodeCounter(encoded)
      expect(decoded).toBe(counter)
    })

    it('handles counter = 0', () => {
      const encoded = encodeCounter(0)
      const decoded = decodeCounter(encoded)
      expect(decoded).toBe(0)
    })

    it('handles max counter (uint32)', () => {
      const maxCounter = 0xffffffff
      const encoded = encodeCounter(maxCounter)
      const decoded = decodeCounter(encoded)
      expect(decoded).toBe(maxCounter)
    })
  })

  describe('deriveKeyAndSalt', () => {
    it('derives deterministic key and salt from baseKey and keyId', () => {
      const { key, salt } = deriveKeyAndSalt(baseKey, keyId)
      expect(key.length).toBe(16)
      expect(salt.length).toBe(16)

      const { key: key2, salt: salt2 } = deriveKeyAndSalt(baseKey, keyId)
      expect(key).toEqual(key2)
      expect(salt).toEqual(salt2)
    })

    it('produces different keys for different keyIds', () => {
      const { key: key1 } = deriveKeyAndSalt(baseKey, 1)
      const { key: key2 } = deriveKeyAndSalt(baseKey, 2)
      expect(key1).not.toEqual(key2)
    })
  })

  describe('deriveNonce', () => {
    it('derives deterministic nonce from salt and counter', () => {
      const { salt } = deriveKeyAndSalt(baseKey, keyId)
      const nonce = deriveNonce(salt, 42)
      expect(nonce.length).toBe(12)

      const nonce2 = deriveNonce(salt, 42)
      expect(nonce).toEqual(nonce2)
    })

    it('produces different nonces for different counters', () => {
      const { salt } = deriveKeyAndSalt(baseKey, keyId)
      const nonce1 = deriveNonce(salt, 1)
      const nonce2 = deriveNonce(salt, 2)
      expect(nonce1).not.toEqual(nonce2)
    })

    it('produces different nonces for different salts', () => {
      const { salt: salt1 } = deriveKeyAndSalt(baseKey, 1)
      const { salt: salt2 } = deriveKeyAndSalt(baseKey, 2)
      const nonce1 = deriveNonce(salt1, 42)
      const nonce2 = deriveNonce(salt2, 42)
      expect(nonce1).not.toEqual(nonce2)
    })
  })

  describe('SFrameEncryptor', () => {
    let encryptor: SFrameEncryptor

    beforeEach(() => {
      encryptor = new SFrameEncryptor(baseKey, keyId)
    })

    it('encrypts and produces header + ciphertext + tag', () => {
      const ciphertext = encryptor.encrypt(plaintext)
      expect(ciphertext.length).toBe(SFRAME_HEADER_LENGTH + plaintext.length + SFRAME_TAG_LENGTH)

      const header = ciphertext.slice(0, SFRAME_HEADER_LENGTH)
      const decodedKeyId = decodeKeyId(header.slice(0, 4))
      const decodedCounter = decodeCounter(header.slice(4, 8))
      expect(decodedKeyId).toBe(keyId)
      expect(decodedCounter).toBe(0)
    })

    it('increments counter on each encryption', () => {
      const c1 = encryptor.encrypt(plaintext)
      const c2 = encryptor.encrypt(plaintext)

      const counter1 = decodeCounter(c1.slice(4, 8))
      const counter2 = decodeCounter(c2.slice(4, 8))
      expect(counter2).toBe(counter1 + 1)
    })

    it('produces different ciphertext for same plaintext (due to counter)', () => {
      const c1 = encryptor.encrypt(plaintext)
      const c2 = encryptor.encrypt(plaintext)
      expect(c1).not.toEqual(c2)
    })

    it('setKeyId changes the key ID for subsequent encryptions', () => {
      const c1 = encryptor.encrypt(plaintext)
      encryptor.setKeyId(10)
      const c2 = encryptor.encrypt(plaintext)

      const keyId1 = decodeKeyId(c1.slice(0, 4))
      const keyId2 = decodeKeyId(c2.slice(0, 4))
      expect(keyId1).toBe(keyId)
      expect(keyId2).toBe(10)
    })

    it('reset() resets counter to 0', () => {
      encryptor.encrypt(plaintext)
      encryptor.encrypt(plaintext)
      encryptor.reset()
      const c = encryptor.encrypt(plaintext)
      const counter = decodeCounter(c.slice(4, 8))
      expect(counter).toBe(0)
    })
  })

  describe('SFrameDecryptor', () => {
    let encryptor: SFrameEncryptor
    let decryptor: SFrameDecryptor

    beforeEach(() => {
      encryptor = new SFrameEncryptor(baseKey, keyId)
      decryptor = new SFrameDecryptor(baseKey, keyId)
    })

    it('decrypts correctly encrypted frame', () => {
      const ciphertext = encryptor.encrypt(plaintext)
      const decrypted = decryptor.decrypt(ciphertext)
      expect(decrypted).toEqual(plaintext)
    })

    it('decrypts multiple frames in order', () => {
      const frames = [
        new TextEncoder().encode('Frame 1'),
        new TextEncoder().encode('Frame 2'),
        new TextEncoder().encode('Frame 3'),
      ]

      const ciphertexts = frames.map(f => encryptor.encrypt(f))
      const decrypted = ciphertexts.map(c => decryptor.decrypt(c))
      expect(decrypted).toEqual(frames)
    })

    it('throws on key ID mismatch', () => {
      const encryptor2 = new SFrameEncryptor(baseKey, keyId + 1)
      const ciphertext = encryptor2.encrypt(plaintext)
      expect(() => decryptor.decrypt(ciphertext)).toThrow('Key ID mismatch')
    })

    it('throws on replay attack (same counter)', () => {
      const ciphertext = encryptor.encrypt(plaintext)
      decryptor.decrypt(ciphertext)
      expect(() => decryptor.decrypt(ciphertext)).toThrow('Replay detected')
    })

    it('throws on ciphertext too short', () => {
      const shortCiphertext = new Uint8Array(SFRAME_HEADER_LENGTH + SFRAME_TAG_LENGTH - 1)
      expect(() => decryptor.decrypt(shortCiphertext)).toThrow('Ciphertext too short')
    })

    it('handles out-of-order delivery within replay window', () => {
      const frames = [
        new TextEncoder().encode('Frame 1'),
        new TextEncoder().encode('Frame 2'),
        new TextEncoder().encode('Frame 3'),
      ]

      const ciphertexts = frames.map(f => encryptor.encrypt(f))
      decryptor.decrypt(ciphertexts[2])
      decryptor.decrypt(ciphertexts[0])
      const decrypted = decryptor.decrypt(ciphertexts[1])
      expect(decrypted).toEqual(frames[1])
    })

    it('rejects replay outside window (64 frames)', () => {
      let firstCiphertext: Uint8Array | null = null
      for (let i = 0; i < 65; i++) {
        const frame = new TextEncoder().encode(`Frame ${i}`)
        const ciphertext = encryptor.encrypt(frame)
        if (i === 0) {
          firstCiphertext = ciphertext
        }
        if (i < 64) {
          decryptor.decrypt(ciphertext)
        }
      }
      expect(firstCiphertext).not.toBeNull()
      expect(() => decryptor.decrypt(firstCiphertext!)).toThrow('Replay detected')
    })

    it('reset() clears replay window', () => {
      const ciphertext = encryptor.encrypt(plaintext)
      decryptor.decrypt(ciphertext)
      decryptor.reset()
      const decrypted = decryptor.decrypt(ciphertext)
      expect(decrypted).toEqual(plaintext)
    })
  })

  describe('Encryptor/Decryptor roundtrip with different keyIds', () => {
    it('works with keyId = 0', () => {
      const enc = new SFrameEncryptor(baseKey, 0)
      const dec = new SFrameDecryptor(baseKey, 0)
      const ct = enc.encrypt(plaintext)
      const pt = dec.decrypt(ct)
      expect(pt).toEqual(plaintext)
    })

    it('works with large keyId', () => {
      const largeKeyId = 0x12345678
      const enc = new SFrameEncryptor(baseKey, largeKeyId)
      const dec = new SFrameDecryptor(baseKey, largeKeyId)
      const ct = enc.encrypt(plaintext)
      const pt = dec.decrypt(ct)
      expect(pt).toEqual(plaintext)
    })
  })
})