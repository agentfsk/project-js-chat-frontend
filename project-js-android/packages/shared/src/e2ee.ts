import {
  generateIdentityKeyPair,
  generateX25519KeyPair,
  generateSignedPreKeyPair,
  generatePreKeyPair,
  generatePreKeyBundle,
  createKeyPackage,
  computeSharedSecret,
  parseKeyPackage,
  type IdentityKeyPair,
  type SignedPreKeyPair,
  type PreKeyPair,
  type KeyPackage,
  type PreKeyBundle,
} from './crypto/x3dh'
import { DoubleRatchet } from './crypto/doubleRatchet'
import { computeSafetyNumber, formatSafetyNumber } from './crypto/safetyNumber'
import { SFrameEncryptor, SFrameDecryptor } from './crypto/sframe'
import type { CallKeyPackage } from './types'

export interface E2EEContext {
  encryptor: SFrameEncryptor
  decryptor: SFrameDecryptor
  ratchet: DoubleRatchet
  safetyNumber: bigint
  keyId: number
  localKeyPackage: CallKeyPackage
  remoteKeyPackage: CallKeyPackage | null
}

let identityKeyPair: IdentityKeyPair | null = null
let signedPreKeyPair: SignedPreKeyPair | null = null
let preKeys: PreKeyPair[] = []
const PRE_KEY_COUNT = 100

export function initializeIdentityKeys(
  getIdentityKeyPair: () => Promise<IdentityKeyPair | null>,
  saveIdentityKeyPair: (kp: IdentityKeyPair) => Promise<void>,
  getSignedPreKey: () => Promise<SignedPreKeyPair | null>,
  saveSignedPreKey: (kp: SignedPreKeyPair) => Promise<void>,
  getAllPreKeys: () => Promise<PreKeyPair[]>,
  savePreKeys: (kps: PreKeyPair[]) => Promise<void>
): Promise<void> {
  let ikp = await getIdentityKeyPair()
  if (!ikp) {
    ikp = generateIdentityKeyPair()
    await saveIdentityKeyPair(ikp)
  }
  identityKeyPair = ikp

  let spkp = await getSignedPreKey()
  if (!spkp) {
    spkp = generateSignedPreKeyPair(ikp, Date.now())
    await saveSignedPreKey(spkp)
  }
  signedPreKeyPair = spkp

  const existingPreKeys = await getAllPreKeys()
  if (existingPreKeys.length < PRE_KEY_COUNT) {
    const newPreKeys: PreKeyPair[] = []
    for (let i = 0; i < PRE_KEY_COUNT - existingPreKeys.length; i++) {
      newPreKeys.push(generatePreKeyPair(Date.now() + i))
    }
    preKeys = [...existingPreKeys, ...newPreKeys]
    await savePreKeys(preKeys)
  } else {
    preKeys = existingPreKeys
  }
}

export function rotatePreKeys(
  saveSignedPreKey: (kp: SignedPreKeyPair) => Promise<void>,
  savePreKeys: (kps: PreKeyPair[]) => Promise<void>
): void {
  if (!identityKeyPair) return
  signedPreKeyPair = generateSignedPreKeyPair(identityKeyPair, Date.now())
  saveSignedPreKey(signedPreKeyPair)

  const newPreKeys: PreKeyPair[] = []
  for (let i = 0; i < PRE_KEY_COUNT; i++) {
    newPreKeys.push(generatePreKeyPair(Date.now() + i))
  }
  preKeys = newPreKeys
  savePreKeys(preKeys)
}

export function getKeyPackage(): CallKeyPackage | null {
  if (!identityKeyPair || !signedPreKeyPair || preKeys.length === 0) {
    return null
  }
  const ephemeralKeyPair = { privateKey: generateIdentityKeyPair().privateKey, publicKey: generateIdentityKeyPair().publicKey }
  const oneTimePreKey = preKeys.shift()!
  const preKeyBundle = generatePreKeyBundle(identityKeyPair, signedPreKeyPair, preKeys)
  const keyPackage = createKeyPackage(preKeyBundle, ephemeralKeyPair, oneTimePreKey)
  return keyPackage
}

export function createE2EEContext(
  callId: string,
  isInitiator: boolean,
  localKeyPackage: CallKeyPackage,
  remoteKeyPackage: CallKeyPackage,
  localIdentityKeyPair: IdentityKeyPair,
  localSignedPreKeyPair: SignedPreKeyPair,
  localPreKeyPair: PreKeyPair | undefined
): E2EEContext {
  const localIdentityKey = parseKeyPackage(localKeyPackage).identityKey
  const remoteIdentityKey = parseKeyPackage(remoteKeyPackage).identityKey
  const safetyNumber = computeSafetyNumber(localIdentityKey, remoteIdentityKey)

  const preKeyBundle = parseKeyPackage(remoteKeyPackage)
  const ephemeralKeyPair = generateX25519KeyPair()
  const sharedSecret = computeSharedSecret(
    localIdentityKeyPair,
    localSignedPreKeyPair,
    localPreKeyPair,
    ephemeralKeyPair,
    remoteKeyPackage,
    isInitiator
  )

  const ratchet = new DoubleRatchet()
  if (isInitiator) {
    ratchet.initialize(sharedSecret, ephemeralKeyPair, preKeyBundle.ephemeralKey)
  } else {
    ratchet.initializeAsResponder(sharedSecret, preKeyBundle.ephemeralKey)
  }

  const sendingKey = ratchet.ratchetSend().messageKey
  const receivingKey = ratchet.ratchetReceive({ dh: preKeyBundle.ephemeralKey, pn: 0, n: 0 })

  const encryptor = new SFrameEncryptor(sendingKey, 0)
  const decryptor = new SFrameDecryptor(receivingKey, 0)

  return {
    encryptor,
    decryptor,
    ratchet,
    safetyNumber,
    keyId: 0,
    localKeyPackage,
    remoteKeyPackage,
  }
}

export function getSafetyNumberFormatted(safetyNumber: bigint): string {
  return formatSafetyNumber(safetyNumber)
}

export function getCurrentKeyId(): number {
  return 0
}