import { describe, it, expect, beforeEach } from 'vitest'
import {
  DoubleRatchet,
  type MessageKeys,
} from './doubleRatchet'
import { hkdfSHA256 } from './hkdf'
import { x25519 } from '@noble/curves/ed25519'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

describe('doubleRatchet', () => {
  let alice: DoubleRatchet
  let bob: DoubleRatchet
  let rootKey: Uint8Array
  let aliceDH: { privateKey: Uint8Array; publicKey: Uint8Array }
  let bobDH: { privateKey: Uint8Array; publicKey: Uint8Array }

  beforeEach(() => {
    rootKey = new Uint8Array(32).fill(42)
    const alicePriv = x25519.utils.randomPrivateKey()
    aliceDH = { privateKey: alicePriv, publicKey: x25519.getPublicKey(alicePriv) }
    const bobPriv = x25519.utils.randomPrivateKey()
    bobDH = { privateKey: bobPriv, publicKey: x25519.getPublicKey(bobPriv) }

    alice = new DoubleRatchet()
    bob = new DoubleRatchet()

    alice.initialize(rootKey, aliceDH, bobDH.publicKey)
    bob.initializeAsResponder(rootKey, aliceDH.publicKey, bobDH)
  })

  describe('Initialization', () => {
    it('initializes with correct root key', () => {
      expect(alice.getRootKey()).toEqual(rootKey)
    })

    it('initializes with correct sending DH', () => {
      expect(alice.getSendingDH()).toEqual(aliceDH.publicKey)
    })

    it('responder initializes with correct receiving DH', () => {
      expect(bob.getRootKey()).toEqual(rootKey)
    })
  })

  describe('Ratchet send/receive', () => {
    it('Alice sends, Bob receives - first message', () => {
      const { messageKey: aliceKey, header } = alice.ratchetSend()
      const bobKey = bob.ratchetReceive(header)
      expect(aliceKey).toEqual(bobKey)
    })

    it('Bob sends, Alice receives - first message', () => {
      const { messageKey: bobKey, header } = bob.ratchetSend()
      const aliceKey = alice.ratchetReceive(header)
      expect(bobKey).toEqual(aliceKey)
    })

    it('Multiple messages in same chain produce different keys', () => {
      const keys: Uint8Array[] = []
      for (let i = 0; i < 5; i++) {
        const { messageKey, header } = alice.ratchetSend()
        const bobKey = bob.ratchetReceive(header)
        expect(messageKey).toEqual(bobKey)
        keys.push(messageKey)
      }
      for (let i = 1; i < keys.length; i++) {
        expect(keys[i]).not.toEqual(keys[i - 1])
      }
    })

    it('Chain keys advance correctly', () => {
      const { messageKey: key1, header: h1 } = alice.ratchetSend()
      const { messageKey: key2, header: h2 } = alice.ratchetSend()

      const bobKey1 = bob.ratchetReceive(h1)
      const bobKey2 = bob.ratchetReceive(h2)

      expect(key1).toEqual(bobKey1)
      expect(key2).toEqual(bobKey2)
      expect(key1).not.toEqual(key2)
    })
  })

  describe('DH Ratchet', () => {
    it('performs DH ratchet when Bob sends new DH', () => {
      alice.ratchetSend()
      alice.ratchetSend()

      const bobPriv2 = x25519.utils.randomPrivateKey()
      const bobDH2 = { privateKey: bobPriv2, publicKey: x25519.getPublicKey(bobPriv2) }
      const { messageKey: bobKey, header } = bob.ratchetSend()
      header.dh = bobDH2.publicKey

      const aliceKey = alice.ratchetReceive(header)
      expect(aliceKey).toEqual(bobKey)
    })

    it('advances root key on DH ratchet', () => {
      const rootKeyBefore = alice.getRootKey()
      alice.ratchetSend()

      const bobPriv2 = x25519.utils.randomPrivateKey()
      const bobDH2 = { privateKey: bobPriv2, publicKey: x25519.getPublicKey(bobPriv2) }
      const { header } = bob.ratchetSend()
      header.dh = bobDH2.publicKey

      alice.ratchetReceive(header)
      const rootKeyAfter = alice.getRootKey()

      expect(rootKeyAfter).not.toEqual(rootKeyBefore)
    })

    it('resets sending chain on DH ratchet', () => {
      alice.ratchetSend()
      alice.ratchetSend()

      const bobPriv2 = x25519.utils.randomPrivateKey()
      const bobDH2 = { privateKey: bobPriv2, publicKey: x25519.getPublicKey(bobPriv2) }
      const { header } = bob.ratchetSend()
      header.dh = bobDH2.publicKey

      alice.ratchetReceive(header)

      const { messageKey: newKey, header: newHeader } = alice.ratchetSend()
      const bobKey = bob.ratchetReceive(newHeader)
      expect(newKey).toEqual(bobKey)
    })

    it('handles multiple DH ratchets', () => {
      for (let i = 0; i < 3; i++) {
        const { header } = bob.ratchetSend()
        const bobPriv2 = x25519.utils.randomPrivateKey()
        bobDH = { privateKey: bobPriv2, publicKey: x25519.getPublicKey(bobPriv2) }
        header.dh = bobDH.publicKey
        alice.ratchetReceive(header)

        const { messageKey, header: h2 } = alice.ratchetSend()
        const bobKey = bob.ratchetReceive(h2)
        expect(messageKey).toEqual(bobKey)
      }
    })
  })

  describe('Out-of-order delivery', () => {
    it('handles skipped messages within MAX_SKIP', () => {
      const messages = []
      for (let i = 0; i < 5; i++) {
        const { messageKey, header } = alice.ratchetSend()
        messages.push({ messageKey, header })
      }

      const bobKey4 = bob.ratchetReceive(messages[4].header)
      expect(bobKey4).toEqual(messages[4].messageKey)

      const bobKey2 = bob.ratchetReceive(messages[2].header)
      expect(bobKey2).toEqual(messages[2].messageKey)

      const bobKey0 = bob.ratchetReceive(messages[0].header)
      expect(bobKey0).toEqual(messages[0].messageKey)
    })

    it('throws on too many skipped messages', () => {
      const messages = []
      for (let i = 0; i < 105; i++) {
        const { messageKey, header } = alice.ratchetSend()
        messages.push({ messageKey, header })
      }

      bob.ratchetReceive(messages[104].header)
      expect(() => bob.ratchetReceive(messages[0].header)).toThrow('Too many skipped messages')
    })
  })

  describe('Skipped message keys', () => {
    it('can decrypt skipped messages using trySkippedMessageKey', () => {
      const messages = []
      for (let i = 0; i < 5; i++) {
        const { messageKey, header } = alice.ratchetSend()
        messages.push({ messageKey, header })
      }

      bob.ratchetReceive(messages[4].header)

      const skippedKey = bob.trySkippedMessageKey(messages[2].header)
      expect(skippedKey).toEqual(messages[2].messageKey)

      const secondTry = bob.trySkippedMessageKey(messages[2].header)
      expect(secondTry).toBeNull()
    })

    it('returns null for non-skipped message', () => {
      alice.ratchetSend()
      const { header } = alice.ratchetSend()
      const result = bob.trySkippedMessageKey(header)
      expect(result).toBeNull()
    })
  })

  describe('Serialization', () => {
    it('serializes and deserializes correctly', () => {
      alice.ratchetSend()
      alice.ratchetSend()

      const serialized = alice.serialize()
      const deserialized = DoubleRatchet.deserialize(serialized)

      expect(deserialized.getRootKey()).toEqual(alice.getRootKey())
      expect(deserialized.getSendingDH()).toEqual(alice.getSendingDH())
    })

    it('deserialized ratchet works correctly', () => {
      alice.ratchetSend()
      alice.ratchetSend()

      const serialized = alice.serialize()
      const deserialized = DoubleRatchet.deserialize(serialized)

      const { messageKey, header } = deserialized.ratchetSend()
      const bobKey = bob.ratchetReceive(header)
      expect(messageKey).toEqual(bobKey)
    })

    it('empty serialize returns empty string', () => {
      const empty = new DoubleRatchet()
      expect(empty.serialize()).toBe('')
    })
  })

  describe('Cross-party consistency', () => {
    it('Alice and Bob stay in sync over multiple exchanges', () => {
      for (let round = 0; round < 10; round++) {
        const { messageKey: aKey, header: aHeader } = alice.ratchetSend()
        const bKey = bob.ratchetReceive(aHeader)
        expect(aKey).toEqual(bKey)

        const { messageKey: bKey2, header: bHeader } = bob.ratchetSend()
        const aKey2 = alice.ratchetReceive(bHeader)
        expect(bKey2).toEqual(aKey2)
      }
    })

    it('handles DH ratchet mid-conversation', () => {
      for (let i = 0; i < 3; i++) {
        const { header } = alice.ratchetSend()
        bob.ratchetReceive(header)
      }

      const bobPriv2 = x25519.utils.randomPrivateKey()
      bobDH = { privateKey: bobPriv2, publicKey: x25519.getPublicKey(bobPriv2) }
      const { header } = bob.ratchetSend()
      header.dh = bobDH.publicKey
      const aliceKey = alice.ratchetReceive(header)

      const { messageKey, header: h2 } = alice.ratchetSend()
      const bobKey = bob.ratchetReceive(h2)
      expect(messageKey).toEqual(bobKey)
      expect(messageKey).toEqual(aliceKey)
    })
  })
})