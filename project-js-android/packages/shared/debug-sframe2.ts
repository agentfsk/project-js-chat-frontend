import { SFrameEncryptor, SFrameDecryptor } from './src/crypto/sframe'

const baseKey = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15])
const keyId = 5

console.log('baseKey:', Array.from(baseKey))
console.log('keyId:', keyId)

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
  const keyIdDecoded = new DataView(header.buffer).getUint32(0, false)
  const counterDecoded = new DataView(header.buffer).getUint32(4, false)
  console.log(`Frame ${i}: ciphertext length=${ct.length}, header=[${Array.from(header)}], keyId=${keyIdDecoded}, counter=${counterDecoded}`)
  return ct
})

console.log('\n--- Decrypting frames ---')
ciphertexts.forEach((ct, i) => {
  const header = ct.slice(0, 8)
  const keyIdDecoded = new DataView(header.buffer).getUint32(0, false)
  const counterDecoded = new DataView(header.buffer).getUint32(4, false)
  const replayKey = (keyIdDecoded << 32) | counterDecoded
  console.log(`Frame ${i}: keyId=${keyIdDecoded}, counter=${counterDecoded}, replayKey=${replayKey}, inWindow=${decryptor['replayWindow'].has(replayKey)}`)
  
  try {
    const pt = decryptor.decrypt(ct)
    console.log(`Frame ${i}: decrypted successfully, plaintext=${new TextDecoder().decode(pt)}, windowSize=${decryptor['replayWindow'].size}`)
  } catch (e) {
    console.log(`Frame ${i}: ERROR - ${e.message}, windowSize=${decryptor['replayWindow'].size}`)
  }
})