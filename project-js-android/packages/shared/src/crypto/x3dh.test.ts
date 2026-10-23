import { describe, it, expect } from 'vitest'
import {
  generateIdentityKeyPair,
  generateX25519KeyPair,
  generateSignedPreKeyPair,
  generatePreKeyPair,
  generatePreKeyBundle,
  createKeyPackage,
  parseKeyPackage,
  computeSharedSecret,
  verifySignedPreKey,
  bytesToBase64,
  base64ToBytes,
  type IdentityKeyPair,
  type SignedPreKeyPair,
  type PreKeyPair,
  type PreKeyBundle,
  type KeyPackage,
} from './x3dh'

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

describe('x3dh', () => {
  describe('Key generation', () => {
    it('generates valid identity key pair (Ed25519 + X25519)', () => {
      const ikp = generateIdentityKeyPair()
      expect(ikp.privateKey.length).toBe(32)
      expect(ikp.ed25519PublicKey.length).toBe(32)
      expect(ikp.x25519PublicKey.length).toBe(32)
    })

    it('generates valid X25519 key pair', () => {
      const kp = generateX25519KeyPair()
      expect(kp.privateKey.length).toBe(32)
      expect(kp.publicKey.length).toBe(32)
    })

    it('generates signed pre-key with valid signature', () => {
      const ikp = generateIdentityKeyPair()
      const spkp = generateSignedPreKeyPair(ikp, 1)
      expect(spkp.keyId).toBe(1)
      expect(spkp.privateKey.length).toBe(32)
      expect(spkp.publicKey.length).toBe(32)
      expect(spkp.signature.length).toBe(64)

      const valid = verifySignedPreKey(ikp.ed25519PublicKey, spkp.publicKey, spkp.signature)
      expect(valid).toBe(true)
    })

    it('generates one-time pre-key', () => {
      const opk = generatePreKeyPair(42)
      expect(opk.keyId).toBe(42)
      expect(opk.privateKey.length).toBe(32)
      expect(opk.publicKey.length).toBe(32)
    })

    it('generates pre-key bundle', () => {
      const ikp = generateIdentityKeyPair()
      const spkp = generateSignedPreKeyPair(ikp, 1)
      const opks = [generatePreKeyPair(1), generatePreKeyPair(2), generatePreKeyPair(3)]
      const bundle = generatePreKeyBundle(ikp, spkp, opks)

      expect(bundle.identityKey).toEqual(ikp.x25519PublicKey)
      expect(bundle.signedPreKey).toEqual(spkp)
      expect(bundle.oneTimePreKeys).toHaveLength(3)
    })
  })

  describe('Key package creation and parsing', () => {
    it('creates and parses key package correctly', () => {
      const ikp = generateIdentityKeyPair()
      const spkp = generateSignedPreKeyPair(ikp, 1)
      const opk = generatePreKeyPair(2)
      const bundle = generatePreKeyBundle(ikp, spkp, [opk])
      const ekp = generateX25519KeyPair()

      const keyPackage = createKeyPackage(bundle, ekp, opk)
      const parsed = parseKeyPackage(keyPackage)

      expect(parsed.identityKey).toEqual(ikp.x25519PublicKey)
      expect(parsed.signedPreKeyPublicKey).toEqual(spkp.publicKey)
      expect(parsed.signedPreKeySignature).toEqual(spkp.signature)
      expect(parsed.oneTimePreKeyPublicKey).toEqual(opk.publicKey)
      expect(parsed.ephemeralKey).toEqual(ekp.publicKey)
    })

    it('handles key package without one-time pre-key', () => {
      const ikp = generateIdentityKeyPair()
      const spkp = generateSignedPreKeyPair(ikp, 1)
      const bundle = generatePreKeyBundle(ikp, spkp, [])
      const ekp = generateX25519KeyPair()

      const keyPackage = createKeyPackage(bundle, ekp, undefined)
      const parsed = parseKeyPackage(keyPackage)

      expect(parsed.oneTimePreKeyPublicKey).toBeUndefined()
    })
  })

  describe('X3DH Shared Secret computation', () => {
    it('computes shared secret correctly (initiator)', () => {
      const aliceIK = generateIdentityKeyPair()
      const aliceSPK = generateSignedPreKeyPair(aliceIK, 1)
      const aliceOPK = generatePreKeyPair(2)
      const aliceBundle = generatePreKeyBundle(aliceIK, aliceSPK, [aliceOPK])

      const bobIK = generateIdentityKeyPair()
      const bobSPK = generateSignedPreKeyPair(bobIK, 10)
      const bobOPK = generatePreKeyPair(20)
      const bobBundle = generatePreKeyBundle(bobIK, bobSPK, [bobOPK])

      const aliceEK = generateX25519KeyPair()
      const bobEK = generateX25519KeyPair()

      const aliceKeyPackage = createKeyPackage(aliceBundle, aliceEK, aliceOPK)
      const bobKeyPackage = createKeyPackage(bobBundle, bobEK, bobOPK)

      const aliceSharedSecret = computeSharedSecret(
        aliceIK,
        aliceSPK,
        aliceOPK,
        aliceEK,
        bobKeyPackage,
        true // Alice is initiator
      )

      const bobSharedSecret = computeSharedSecret(
        bobIK,
        bobSPK,
        bobOPK,
        bobEK,
        aliceKeyPackage,
        false // Bob is responder
      )

      expect(aliceSharedSecret).toEqual(bobSharedSecret)
      expect(aliceSharedSecret.length).toBe(32)
    })

    it('computes shared secret correctly (responder, no OPK)', () => {
      const aliceIK = generateIdentityKeyPair()
      const aliceSPK = generateSignedPreKeyPair(aliceIK, 1)
      const aliceBundle = generatePreKeyBundle(aliceIK, aliceSPK, [])

      const bobIK = generateIdentityKeyPair()
      const bobSPK = generateSignedPreKeyPair(bobIK, 10)
      const bobOPK = generatePreKeyPair(20)
      const bobBundle = generatePreKeyBundle(bobIK, bobSPK, [bobOPK])

      const aliceEK = generateX25519KeyPair()
      const bobEK = generateX25519KeyPair()

      const aliceKeyPackage = createKeyPackage(aliceBundle, aliceEK, undefined)
      const bobKeyPackage = createKeyPackage(bobBundle, bobEK, bobOPK)

      const aliceSharedSecret = computeSharedSecret(
        aliceIK,
        aliceSPK,
        undefined,
        aliceEK,
        bobKeyPackage,
        true // Alice is initiator
      )

      const bobSharedSecret = computeSharedSecret(
        bobIK,
        bobSPK,
        bobOPK,
        bobEK,
        aliceKeyPackage,
        false // Bob is responder
      )

      expect(aliceSharedSecret).toEqual(bobSharedSecret)
      expect(aliceSharedSecret.length).toBe(32)
    })

    it('produces different secrets for different ephemeral keys', () => {
      const aliceIK = generateIdentityKeyPair()
      const aliceSPK = generateSignedPreKeyPair(aliceIK, 1)
      const aliceOPK = generatePreKeyPair(2)
      const aliceBundle = generatePreKeyBundle(aliceIK, aliceSPK, [aliceOPK])

      const bobIK = generateIdentityKeyPair()
      const bobSPK = generateSignedPreKeyPair(bobIK, 10)
      const bobOPK = generatePreKeyPair(20)
      const bobBundle = generatePreKeyBundle(bobIK, bobSPK, [bobOPK])

      const aliceEK1 = generateX25519KeyPair()
      const aliceEK2 = generateX25519KeyPair()
      const bobEK = generateX25519KeyPair()

      const keyPackage1 = createKeyPackage(aliceBundle, aliceEK1, aliceOPK)
      const keyPackage2 = createKeyPackage(aliceBundle, aliceEK2, aliceOPK)
      const bobKeyPackage = createKeyPackage(bobBundle, bobEK, bobOPK)

      const secret1 = computeSharedSecret(aliceIK, aliceSPK, aliceOPK, aliceEK1, bobKeyPackage, true)
      const secret2 = computeSharedSecret(aliceIK, aliceSPK, aliceOPK, aliceEK2, bobKeyPackage, true)

      expect(secret1).not.toEqual(secret2)
    })
  })

  describe('Signed pre-key verification', () => {
    it('verifies valid signature', () => {
      const ikp = generateIdentityKeyPair()
      const spkp = generateSignedPreKeyPair(ikp, 1)
      expect(verifySignedPreKey(ikp.ed25519PublicKey, spkp.publicKey, spkp.signature)).toBe(true)
    })

    it('rejects invalid signature', () => {
      const ikp1 = generateIdentityKeyPair()
      const ikp2 = generateIdentityKeyPair()
      const spkp = generateSignedPreKeyPair(ikp1, 1)
      expect(verifySignedPreKey(ikp2.ed25519PublicKey, spkp.publicKey, spkp.signature)).toBe(false)
    })

    it('rejects tampered public key', () => {
      const ikp = generateIdentityKeyPair()
      const spkp = generateSignedPreKeyPair(ikp, 1)
      const tamperedKey = new Uint8Array(spkp.publicKey)
      tamperedKey[0] ^= 0xff
      expect(verifySignedPreKey(ikp.publicKey, tamperedKey, spkp.signature)).toBe(false)
    })
  })

  describe('Base64 encoding/decoding', () => {
    it('roundtrips correctly', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 252, 253, 254, 255])
      const encoded = bytesToBase64(original)
      const decoded = base64ToBytes(encoded)
      expect(decoded).toEqual(original)
    })

    it('handles empty array', () => {
      const original = new Uint8Array(0)
      const encoded = bytesToBase64(original)
      const decoded = base64ToBytes(encoded)
      expect(decoded).toEqual(original)
    })
  })
})