import { x25519, ed25519 } from '@noble/curves/ed25519'
import { hkdfSHA256, concatBytes } from './hkdf'
import { randomBytes } from '@noble/hashes/utils'

export interface IdentityKeyPair {
  privateKey: Uint8Array
  publicKey: Uint8Array
}

export interface PreKeyPair {
  keyId: number
  privateKey: Uint8Array
  publicKey: Uint8Array
}

export interface SignedPreKeyPair {
  keyId: number
  privateKey: Uint8Array
  publicKey: Uint8Array
  signature: Uint8Array
}

export interface PreKeyBundle {
  identityKey: Uint8Array
  signedPreKey: SignedPreKeyPair
  oneTimePreKeys: PreKeyPair[]
}

export interface KeyPackage {
  identityKey: string
  signedPreKey: {
    keyId: number
    publicKey: string
    signature: string
  }
  oneTimePreKey?: {
    keyId: number
    publicKey: string
  }
  ephemeralKey: string
}

export function generateIdentityKeyPair(): IdentityKeyPair {
  const privateKey = ed25519.utils.randomPrivateKey()
  const publicKey = ed25519.getPublicKey(privateKey)
  return { privateKey, publicKey }
}

export function generateX25519KeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return { privateKey, publicKey }
}

export function generateSignedPreKeyPair(identityKey: Uint8Array, keyId: number): SignedPreKeyPair {
  const { privateKey, publicKey } = generateX25519KeyPair()
  const signature = ed25519.sign(concatBytes(identityKey, publicKey), identityKey)
  return { keyId, privateKey, publicKey, signature }
}

export function generatePreKeyPair(keyId: number): PreKeyPair {
  const { privateKey, publicKey } = generateX25519KeyPair()
  return { keyId, privateKey, publicKey }
}

export function generatePreKeyBundle(
  identityKeyPair: IdentityKeyPair,
  signedPreKeyPair: SignedPreKeyPair,
  oneTimePreKeys: PreKeyPair[]
): PreKeyBundle {
  return {
    identityKey: identityKeyPair.publicKey,
    signedPreKey: signedPreKeyPair,
    oneTimePreKeys,
  }
}

export function parseKeyPackage(keyPackage: KeyPackage): {
  identityKey: Uint8Array
  signedPreKeyPublicKey: Uint8Array
  signedPreKeySignature: Uint8Array
  oneTimePreKeyPublicKey?: Uint8Array
  ephemeralKey: Uint8Array
} {
  return {
    identityKey: base64ToBytes(keyPackage.identityKey),
    signedPreKeyPublicKey: base64ToBytes(keyPackage.signedPreKey.publicKey),
    signedPreKeySignature: base64ToBytes(keyPackage.signedPreKey.signature),
    oneTimePreKeyPublicKey: keyPackage.oneTimePreKey
      ? base64ToBytes(keyPackage.oneTimePreKey.publicKey)
      : undefined,
    ephemeralKey: base64ToBytes(keyPackage.ephemeralKey),
  }
}

export function createKeyPackage(
  preKeyBundle: PreKeyBundle,
  ephemeralKeyPair: { privateKey: Uint8Array; publicKey: Uint8Array },
  oneTimePreKey?: PreKeyPair
): KeyPackage {
  return {
    identityKey: bytesToBase64(preKeyBundle.identityKey),
    signedPreKey: {
      keyId: preKeyBundle.signedPreKey.keyId,
      publicKey: bytesToBase64(preKeyBundle.signedPreKey.publicKey),
      signature: bytesToBase64(preKeyBundle.signedPreKey.signature),
    },
    oneTimePreKey: oneTimePreKey
      ? {
          keyId: oneTimePreKey.keyId,
          publicKey: bytesToBase64(oneTimePreKey.publicKey),
        }
      : undefined,
    ephemeralKey: bytesToBase64(ephemeralKeyPair.publicKey),
  }
}

export function computeSharedSecret(
  identityKeyPair: IdentityKeyPair,
  signedPreKeyPair: SignedPreKeyPair,
  oneTimePreKeyPair: PreKeyPair | undefined,
  ephemeralKeyPair: { privateKey: Uint8Array; publicKey: Uint8Array },
  peerKeyPackage: KeyPackage
): Uint8Array {
  const peer = parseKeyPackage(peerKeyPackage)

  const dh1 = x25519.getSharedSecret(ephemeralKeyPair.privateKey, peer.signedPreKeyPublicKey)
  const dh2 = x25519.getSharedSecret(identityKeyPair.privateKey, peer.ephemeralKey)
  const dh3 = x25519.getSharedSecret(signedPreKeyPair.privateKey, peer.ephemeralKey)

  let dh4: Uint8Array | null = null
  if (oneTimePreKeyPair && peer.oneTimePreKeyPublicKey) {
    dh4 = x25519.getSharedSecret(oneTimePreKeyPair.privateKey, peer.oneTimePreKeyPublicKey)
  }

  const parts = [dh1, dh2, dh3]
  if (dh4) parts.push(dh4)

  const ikm = concatBytes(...parts)
  const salt = new Uint8Array(32)
  return hkdfSHA256(salt, ikm, new TextEncoder().encode('X3DH'), 32)
}

export function verifySignedPreKey(
  identityKey: Uint8Array,
  signedPreKeyPublicKey: Uint8Array,
  signature: Uint8Array
): boolean {
  try {
    return ed25519.verify(signature, concatBytes(identityKey, signedPreKeyPublicKey), identityKey)
  } catch {
    return false
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}