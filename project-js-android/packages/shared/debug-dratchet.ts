import { DoubleRatchet } from './src/crypto/doubleRatchet'
import { x25519 } from '@noble/curves/ed25519'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const rootKey = new Uint8Array(32).fill(42)
const aliceDH = { privateKey: x25519.utils.randomPrivateKey(), publicKey: x25519.getPublicKey(x25519.utils.randomPrivateKey()) }
const bobDH = { privateKey: x25519.utils.randomPrivateKey(), publicKey: x25519.getPublicKey(x25519.utils.randomPrivateKey()) }

console.log('rootKey:', bytesToHex(rootKey))
console.log('aliceDH pub:', bytesToHex(aliceDH.publicKey))
console.log('bobDH pub:', bytesToHex(bobDH.publicKey))

const alice = new DoubleRatchet()
const bob = new DoubleRatchet()

alice.initialize(rootKey, aliceDH, bobDH.publicKey)
bob.initializeAsResponder(rootKey, aliceDH.publicKey, bobDH)

console.log('\n=== After initialization ===')
console.log('Alice rootKey:', bytesToHex(alice.getRootKey()))
console.log('Bob rootKey:', bytesToHex(bob.getRootKey()))
console.log('Alice sendingDH:', bytesToHex(alice.getSendingDH()))
console.log('Bob sendingDH:', bytesToHex(bob.getSendingDH()))

console.log('\n=== Alice sends first message ===')
const { messageKey: aliceKey, header } = alice.ratchetSend()
console.log('Alice messageKey:', bytesToHex(aliceKey))
console.log('Header dh:', bytesToHex(header.dh))
console.log('Header pn:', header.pn, 'n:', header.n)

console.log('\n=== Bob receives ===')
const bobKey = bob.ratchetReceive(header)
console.log('Bob messageKey:', bytesToHex(bobKey))

console.log('\n=== Keys match? ===')
console.log('Match:', aliceKey.every((v, i) => v === bobKey[i]))