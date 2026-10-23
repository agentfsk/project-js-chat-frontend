import { DoubleRatchet } from './src/crypto/doubleRatchet'
import { x25519 } from '@noble/curves/ed25519'
import { hkdfSHA256 } from './src/crypto/hkdf'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const rootKey = new Uint8Array(32).fill(42)
const aliceDH = { privateKey: x25519.utils.randomPrivateKey(), publicKey: x25519.getPublicKey(x25519.utils.randomPrivateKey()) }
const bobDH = { privateKey: x25519.utils.randomPrivateKey(), publicKey: x25519.getPublicKey(x25519.utils.randomPrivateKey()) }

console.log('rootKey:', bytesToHex(rootKey))
console.log('aliceDH pub:', bytesToHex(aliceDH.publicKey))
console.log('bobDH pub:', bytesToHex(bobDH.publicKey))

// Manual computation of chainKey
const dhSharedSecret = x25519.getSharedSecret(aliceDH.privateKey, bobDH.publicKey)
console.log('\n=== Manual chainKey computation ===')
console.log('dhSharedSecret:', bytesToHex(dhSharedSecret))
const chainKey = hkdfSHA256(rootKey, dhSharedSecret, new TextEncoder().encode('chain'), 32)
console.log('chainKey:', bytesToHex(chainKey))
const messageKey = hkdfSHA256(new Uint8Array(32), chainKey, new TextEncoder().encode('msg'), 32)
console.log('messageKey:', bytesToHex(messageKey))

const alice = new DoubleRatchet()
const bob = new DoubleRatchet()

alice.initialize(rootKey, aliceDH, bobDH.publicKey)
bob.initializeAsResponder(rootKey, aliceDH.publicKey, bobDH)

// Check internal state by accessing private fields (TypeScript will complain but works at runtime)
const aliceState = (alice as any).state
const bobState = (bob as any).state

console.log('\n=== Alice state ===')
console.log('sending.key:', bytesToHex(aliceState.sending.key))
console.log('receiving.key:', bytesToHex(aliceState.receiving.key))

console.log('\n=== Bob state ===')
console.log('sending.key:', bytesToHex(bobState.sending.key))
console.log('receiving.key:', bytesToHex(bobState.receiving.key))

console.log('\n=== Alice sends first message ===')
const { messageKey: aliceKey, header } = alice.ratchetSend()
console.log('Alice messageKey:', bytesToHex(aliceKey))
console.log('Header dh:', bytesToHex(header.dh))

console.log('\n=== Bob receives ===')
const bobKey = bob.ratchetReceive(header)
console.log('Bob messageKey:', bytesToHex(bobKey))

console.log('\n=== Keys match? ===')
console.log('Match:', aliceKey.every((v, i) => v === bobKey[i]))