import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'

export function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Uint8Array {
  if (salt.length === 0) {
    salt = new Uint8Array(32)
  }
  return hmac(sha256, salt, ikm)
}

export function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  const hashLen = 32
  if (length > 255 * hashLen) {
    throw new Error('Length too large')
  }
  const n = Math.ceil(length / hashLen)
  const okm = new Uint8Array(n * hashLen)
  let prev = new Uint8Array(0)
  for (let i = 1; i <= n; i++) {
    const infoWithCounter = new Uint8Array(prev.length + info.length + 1)
    infoWithCounter.set(prev)
    infoWithCounter.set(info, prev.length)
    infoWithCounter[infoWithCounter.length - 1] = i
    const h = hmac(sha256, prk, infoWithCounter)
    okm.set(h, (i - 1) * hashLen)
    prev = h
  }
  return okm.slice(0, length)
}

export function hkdfSHA256(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  const prk = hkdfExtract(salt, ikm)
  return hkdfExpand(prk, info, length)
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}