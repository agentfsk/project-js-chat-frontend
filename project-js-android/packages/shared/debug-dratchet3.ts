import { x25519 } from '@noble/curves/ed25519'
import { hkdfSHA256 } from './src/crypto/hkdf'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const rootKey = new Uint8Array(32).fill(42)
const aliceDH = { privateKey: x25519.utils.randomPrivateKey(), publicKey: x25519.getPublicKey(x25519.utils.randomPrivateKey()) }
const bobDH = { privateKey: x25519.utils.randomPrivateKey(), publicKey: x25519.getPublicKey(x25519.utils.randomPrivateKey()) }

console.log('aliceDH.privateKey:', bytesToHex(aliceDH.privateKey))
console.log('aliceDH.publicKey:', bytesToHex(aliceDH.publicKey))
console.log('bobDH.privateKey:', bytesToHex(bobDH.privateKey))
console.log('bobDH.publicKey:', bytesToHex(bobDH.publicKey))

// Alice's computation
const aliceDHSecret = x25519.getSharedSecret(aliceDH.privateKey, bobDH.publicKey)
console.log('\nAlice DH secret:', bytesToHex(aliceDHSecret))

// Bob's computation (should be same)
const bobDHSecret = x25519.getSharedSecret(bobDH.privateKey, aliceDH.publicKey)
console.log('Bob DH secret:', bytesToHex(bobDHSecret))

console.log('Secrets match:', aliceDHSecret.every((v,i) => v === bobDHSecret[i]))

// Chain key computation
const aliceChainKey = hkdfSHA256(rootKey, aliceDHSecret, new TextEncoder().encode('chain'), 32)
const bobChainKey = hkdfSHA256(rootKey, bobDHSecret, new TextEncoder().encode('chain'), 32)

console.log('\nAlice chainKey:', bytesToHex(aliceChainKey))
console.log('Bob chainKey:', bytesToHex(bobChainKey))
console.log('ChainKeys match:', aliceChainKey.every((v,i) => v === bobChainKey[i]))