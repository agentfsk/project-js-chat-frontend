import {
  generateIdentityKeyPair,
  generateX25519KeyPair,
  generateSignedPreKeyPair,
  generatePreKeyPair,
  generatePreKeyBundle,
  createKeyPackage,
  parseKeyPackage,
  computeSharedSecret,
  type IdentityKeyPair,
  type SignedPreKeyPair,
  type PreKeyPair,
  type PreKeyBundle,
  type KeyPackage,
} from './src/crypto/x3dh'

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

console.log('=== Alice\'s keys ===')
console.log('IK_A pub:', Array.from(aliceIK.publicKey).slice(0,8), '...')
console.log('SPK_A pub:', Array.from(aliceSPK.publicKey).slice(0,8), '...')
console.log('OPK_A pub:', Array.from(aliceOPK.publicKey).slice(0,8), '...')
console.log('EK_A pub:', Array.from(aliceEK.publicKey).slice(0,8), '...')

console.log('\n=== Bob\'s keys ===')
console.log('IK_B pub:', Array.from(bobIK.publicKey).slice(0,8), '...')
console.log('SPK_B pub:', Array.from(bobSPK.publicKey).slice(0,8), '...')
console.log('OPK_B pub:', Array.from(bobOPK.publicKey).slice(0,8), '...')
console.log('EK_B pub:', Array.from(bobEK.publicKey).slice(0,8), '...')

const parsedBob = parseKeyPackage(bobKeyPackage)
const parsedAlice = parseKeyPackage(aliceKeyPackage)

console.log('\n=== Parsed Bob key package (what Alice sees) ===')
console.log('IK_B:', Array.from(parsedBob.identityKey).slice(0,8), '...')
console.log('SPK_B:', Array.from(parsedBob.signedPreKeyPublicKey).slice(0,8), '...')
console.log('OPK_B:', Array.from(parsedBob.oneTimePreKeyPublicKey!).slice(0,8), '...')
console.log('EK_B:', Array.from(parsedBob.ephemeralKey).slice(0,8), '...')

console.log('\n=== Parsed Alice key package (what Bob sees) ===')
console.log('IK_A:', Array.from(parsedAlice.identityKey).slice(0,8), '...')
console.log('SPK_A:', Array.from(parsedAlice.signedPreKeyPublicKey).slice(0,8), '...')
console.log('OPK_A:', Array.from(parsedAlice.oneTimePreKeyPublicKey!).slice(0,8), '...')
console.log('EK_A:', Array.from(parsedAlice.ephemeralKey).slice(0,8), '...')

// Alice computes (initiator)
import { x25519 } from '@noble/curves/ed25519'
const aliceDH1 = x25519.getSharedSecret(aliceEK.privateKey, parsedBob.signedPreKeyPublicKey)
const aliceDH2 = x25519.getSharedSecret(aliceIK.privateKey, parsedBob.ephemeralKey)
const aliceDH3 = x25519.getSharedSecret(aliceSPK.privateKey, parsedBob.ephemeralKey)
const aliceDH4 = x25519.getSharedSecret(aliceOPK.privateKey, parsedBob.oneTimePreKeyPublicKey!)

console.log('\n=== Alice\'s DH values (initiator) ===')
console.log('DH1 (EK_A, SPK_B):', Array.from(aliceDH1).slice(0,8), '...')
console.log('DH2 (IK_A, EK_B):', Array.from(aliceDH2).slice(0,8), '...')
console.log('DH3 (SPK_A, EK_B):', Array.from(aliceDH3).slice(0,8), '...')
console.log('DH4 (OPK_A, OPK_B):', Array.from(aliceDH4).slice(0,8), '...')

// Bob computes (responder)
const bobDH1 = x25519.getSharedSecret(bobSPK.privateKey, parsedAlice.ephemeralKey)
const bobDH2 = x25519.getSharedSecret(bobEK.privateKey, parsedAlice.identityKey)
const bobDH3 = x25519.getSharedSecret(bobEK.privateKey, parsedAlice.signedPreKeyPublicKey)
const bobDH4 = x25519.getSharedSecret(bobOPK.privateKey, parsedAlice.oneTimePreKeyPublicKey!)

console.log('\n=== Bob\'s DH values (responder) ===')
console.log('DH1 (SPK_B, EK_A):', Array.from(bobDH1).slice(0,8), '...')
console.log('DH2 (EK_B, IK_A):', Array.from(bobDH2).slice(0,8), '...')
console.log('DH3 (EK_B, SPK_A):', Array.from(bobDH3).slice(0,8), '...')
console.log('DH4 (OPK_B, OPK_A):', Array.from(bobDH4).slice(0,8), '...')

// Check equality
console.log('\n=== DH Equality Check ===')
console.log('DH1 match:', aliceDH1.every((v,i) => v === bobDH1[i]))
console.log('DH2 match:', aliceDH2.every((v,i) => v === bobDH2[i]))
console.log('DH3 match:', aliceDH3.every((v,i) => v === bobDH3[i]))
console.log('DH4 match:', aliceDH4.every((v,i) => v === bobDH4[i]))

const aliceParts = [aliceDH1, aliceDH2, aliceDH3, aliceDH4]
const bobParts = [bobDH1, bobDH2, bobDH3, bobDH4]

const concatBytes = (...arrays: Uint8Array[]) => {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

const aliceIKM = concatBytes(...aliceParts)
const bobIKM = concatBytes(...bobParts)

console.log('\n=== IKM Comparison ===')
console.log('Alice IKM:', Array.from(aliceIKM).slice(0,16), '...')
console.log('Bob IKM:  ', Array.from(bobIKM).slice(0,16), '...')
console.log('IKM match:', aliceIKM.every((v,i) => v === bobIKM[i]))