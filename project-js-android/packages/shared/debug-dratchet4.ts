import { x25519 } from '@noble/curves/ed25519'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Test with known test vectors
const alicePriv = x25519.utils.randomPrivateKey()
const alicePub = x25519.getPublicKey(alicePriv)
const bobPriv = x25519.utils.randomPrivateKey()
const bobPub = x25519.getPublicKey(bobPriv)

console.log('alicePriv:', bytesToHex(alicePriv))
console.log('alicePub:', bytesToHex(alicePub))
console.log('bobPriv:', bytesToHex(bobPriv))
console.log('bobPub:', bytesToHex(bobPub))

// Verify public keys are correctly derived
const alicePub2 = x25519.getPublicKey(alicePriv)
console.log('alicePub (recomputed):', bytesToHex(alicePub2))
console.log('alicePub matches:', alicePub.every((v,i) => v === alicePub2[i]))

const bobPub2 = x25519.getPublicKey(bobPriv)
console.log('bobPub (recomputed):', bytesToHex(bobPub2))
console.log('bobPub matches:', bobPub.every((v,i) => v === bobPub2[i]))

// Compute shared secrets
const secret1 = x25519.getSharedSecret(alicePriv, bobPub)
const secret2 = x25519.getSharedSecret(bobPriv, alicePub)

console.log('\nsecret1:', bytesToHex(secret1))
console.log('secret2:', bytesToHex(secret2))
console.log('Match:', secret1.every((v,i) => v === secret2[i]))

// Test with known RFC 7748 test vector
// From RFC 7748: Alice private = 0x77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a
// Alice public = 0x8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a
// Bob private = 0x5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb
// Bob public = 0xde9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f
// Shared secret = 0x4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742

const rfcAlicePriv = hexToBytes2('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a')
const rfcAlicePub = hexToBytes2('8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a')
const rfcBobPriv = hexToBytes2('5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb')
const rfcBobPub = hexToBytes2('de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f')
const rfcShared = hexToBytes2('4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742')

console.log('\n=== RFC 7748 Test Vector ===')
const rfcSecret1 = x25519.getSharedSecret(rfcAlicePriv, rfcBobPub)
const rfcSecret2 = x25519.getSharedSecret(rfcBobPriv, rfcAlicePub)
console.log('RFC secret1:', bytesToHex2(rfcSecret1))
console.log('RFC secret2:', bytesToHex2(rfcSecret2))
console.log('RFC expected:', bytesToHex2(rfcShared))
console.log('Match expected:', rfcSecret1.every((v,i) => v === rfcShared[i]))
console.log('Match each other:', rfcSecret1.every((v,i) => v === rfcSecret2[i]))

function hexToBytes2(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function bytesToHex2(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}