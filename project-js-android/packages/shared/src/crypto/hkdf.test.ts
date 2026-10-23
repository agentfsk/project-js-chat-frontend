import { describe, it, expect } from 'vitest'
import { hkdfExtract, hkdfExpand, hkdfSHA256, concatBytes } from './hkdf'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('hkdf', () => {
  describe('hkdfExtract', () => {
    it('produces 32-byte output', () => {
      const salt = hexToBytes('000102030405060708090a0b0c')
      const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const prk = hkdfExtract(salt, ikm)
      expect(prk.length).toBe(32)
    })

    it('handles empty salt (uses zero salt)', () => {
      const salt = new Uint8Array(0)
      const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const prk = hkdfExtract(salt, ikm)
      expect(prk.length).toBe(32)
    })

    it('is deterministic', () => {
      const salt = hexToBytes('000102030405060708090a0b0c')
      const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const prk1 = hkdfExtract(salt, ikm)
      const prk2 = hkdfExtract(salt, ikm)
      expect(prk1).toEqual(prk2)
    })

    it('produces different output for different inputs', () => {
      const salt = hexToBytes('000102030405060708090a0b0c')
      const ikm1 = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const ikm2 = hexToBytes('0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c')
      const prk1 = hkdfExtract(salt, ikm1)
      const prk2 = hkdfExtract(salt, ikm2)
      expect(prk1).not.toEqual(prk2)
    })
  })

  describe('hkdfExpand', () => {
    it('produces correct length output', () => {
      const prk = new Uint8Array(32).fill(1)
      const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const okm = hkdfExpand(prk, info, 42)
      expect(okm.length).toBe(42)
    })

    it('handles empty info', () => {
      const prk = new Uint8Array(32).fill(1)
      const info = new Uint8Array(0)
      const okm = hkdfExpand(prk, info, 32)
      expect(okm.length).toBe(32)
    })

    it('is deterministic', () => {
      const prk = new Uint8Array(32).fill(1)
      const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const okm1 = hkdfExpand(prk, info, 42)
      const okm2 = hkdfExpand(prk, info, 42)
      expect(okm1).toEqual(okm2)
    })

    it('produces different output for different info', () => {
      const prk = new Uint8Array(32).fill(1)
      const info1 = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const info2 = hexToBytes('b0b1b2b3b4b5b6b7b8b9')
      const okm1 = hkdfExpand(prk, info1, 32)
      const okm2 = hkdfExpand(prk, info2, 32)
      expect(okm1).not.toEqual(okm2)
    })

    it('produces different output for different PRK', () => {
      const prk1 = new Uint8Array(32).fill(1)
      const prk2 = new Uint8Array(32).fill(2)
      const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const okm1 = hkdfExpand(prk1, info, 32)
      const okm2 = hkdfExpand(prk2, info, 32)
      expect(okm1).not.toEqual(okm2)
    })

    it('throws on length too large', () => {
      const prk = new Uint8Array(32).fill(1)
      const info = new Uint8Array(0)
      expect(() => hkdfExpand(prk, info, 256 * 32)).toThrow('Length too large')
    })
  })

  describe('hkdfSHA256 (combined)', () => {
    it('produces correct length output', () => {
      const salt = hexToBytes('000102030405060708090a0b0c')
      const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const result = hkdfSHA256(salt, ikm, info, 42)
      expect(result.length).toBe(42)
    })

    it('handles empty salt', () => {
      const salt = new Uint8Array(0)
      const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const result = hkdfSHA256(salt, ikm, info, 32)
      expect(result.length).toBe(32)
    })

    it('handles empty info', () => {
      const salt = hexToBytes('000102030405060708090a0b0c')
      const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const info = new Uint8Array(0)
      const result = hkdfSHA256(salt, ikm, info, 32)
      expect(result.length).toBe(32)
    })

    it('is deterministic', () => {
      const salt = hexToBytes('000102030405060708090a0b0c')
      const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const result1 = hkdfSHA256(salt, ikm, info, 42)
      const result2 = hkdfSHA256(salt, ikm, info, 42)
      expect(result1).toEqual(result2)
    })

    it('produces different output for different inputs', () => {
      const salt = hexToBytes('000102030405060708090a0b0c')
      const ikm1 = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')
      const ikm2 = hexToBytes('0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c')
      const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9')
      const result1 = hkdfSHA256(salt, ikm1, info, 32)
      const result2 = hkdfSHA256(salt, ikm2, info, 32)
      expect(result1).not.toEqual(result2)
    })
  })

  describe('concatBytes', () => {
    it('concatenates multiple arrays', () => {
      const a = new Uint8Array([1, 2, 3])
      const b = new Uint8Array([4, 5])
      const c = new Uint8Array([6, 7, 8, 9])

      const result = concatBytes(a, b, c)
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it('handles empty arrays', () => {
      const a = new Uint8Array([1, 2])
      const b = new Uint8Array(0)
      const c = new Uint8Array([3])

      const result = concatBytes(a, b, c)
      expect(Array.from(result)).toEqual([1, 2, 3])
    })

    it('handles single array', () => {
      const a = new Uint8Array([1, 2, 3])
      const result = concatBytes(a)
      expect(Array.from(result)).toEqual([1, 2, 3])
    })
  })
})