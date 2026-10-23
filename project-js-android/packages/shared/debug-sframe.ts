import { SFrameEncryptor, SFrameDecryptor, deriveKeyAndSalt, deriveNonce, encodeKeyId, decodeKeyId, encodeCounter, decodeCounter } from './src/crypto/sframe'

const baseKey = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15])
const keyId = 5
const plaintext = new TextEncoder().encode('Hello, SFrame!')

console.log('baseKey:', Array.from(baseKey))
console.log('keyId:', keyId)
console.log('plaintext:', Array.from(plaintext))

const encryptor = new SFrameEncryptor(baseKey, keyId)
const decryptor = new SFrameDecryptor(baseKey, keyId)

console.log('\n--- Encrypting 3 frames ---')
const frames = [
  new TextEncoder().encode('Frame 1'),
  new TextEncoder().encode('Frame 2'),
  new TextEncoder().encode('Frame 3'),
]

const ciphertexts = frames.map((f, i) => {
  const ct = encryptor.encrypt(f)
  const header = ct.slice(0, 8)
  const keyIdDecoded = decodeKeyId(header.slice(0, 4))
  const counterDecoded = decodeCounter(header.slice(4, 8))
  console.log(`Frame ${i}: ciphertext length=${ct.length}, keyId=${keyIdDecoded}, counter=${counterDecoded}`)
  return ct
})

console.log('\n--- Decrypting frames ---')
ciphertexts.forEach((ct, i) => {
  try {
    const pt = decryptor.decrypt(ct)
    const header = ct.slice(0, 8)
    const keyIdDecoded = decodeKeyId(header.slice(0, 4))
    const counterDecoded = decodeCounter(header.slice(4, 8))
    console.log(`Frame ${i}: decrypted successfully, keyId=${keyIdDecoded}, counter=${counterDecoded}, plaintext=${new TextDecoder().decode(pt)}`)
  } catch (e) {
    console.log(`Frame ${i}: ERROR - ${e.message}`)
  }
})