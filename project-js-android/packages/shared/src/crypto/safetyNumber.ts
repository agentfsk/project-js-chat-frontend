import { hkdfSHA256, concatBytes } from './hkdf'

export const SAFETY_NUMBER_BITS = 60
export const SAFETY_NUMBER_GROUPS = 5
export const SAFETY_NUMBER_DIGITS_PER_GROUP = 4
const SAFETY_NUMBER_MASK = (1n << BigInt(SAFETY_NUMBER_BITS)) - 1n

export function computeSafetyNumber(identityKeyA: Uint8Array, identityKeyB: Uint8Array): bigint {
  const combined = concatBytes(identityKeyA, identityKeyB)
  const hash = hkdfSHA256(new Uint8Array(32), combined, new TextEncoder().encode('safety-number'), 8)
  let result = 0n
  for (let i = 0; i < 8; i++) {
    result = (result << 8n) | BigInt(hash[i] ?? 0)
  }
  return result & SAFETY_NUMBER_MASK
}

export function formatSafetyNumber(safetyNumber: bigint): string {
  const groups: string[] = []
  let num = safetyNumber
  for (let i = 0; i < SAFETY_NUMBER_GROUPS; i++) {
    const group = num & 0xFFFFn
    groups.unshift(group.toString(10).padStart(SAFETY_NUMBER_DIGITS_PER_GROUP, '0'))
    num >>= 16n
  }
  return groups.join(' ')
}

export function parseSafetyNumber(formatted: string): bigint {
  const groups = formatted.replace(/\s+/g, '')
  if (groups.length !== SAFETY_NUMBER_GROUPS * SAFETY_NUMBER_DIGITS_PER_GROUP) {
    throw new Error('Invalid safety number format')
  }
  let result = 0n
  for (let i = 0; i < groups.length; i += SAFETY_NUMBER_DIGITS_PER_GROUP) {
    const group = BigInt(parseInt(groups.slice(i, i + SAFETY_NUMBER_DIGITS_PER_GROUP), 10))
    result = (result << 16n) | group
  }
  return result
}

export function generateQRData(safetyNumber: bigint, username: string): string {
  const fingerprint = safetyNumber.toString(16).padStart(15, '0')
  return `messenger://verify?fp=${fingerprint}&user=${encodeURIComponent(username)}`
}

export function generateQRCodeSVG(data: string, size: number = 200): string {
  const qrSize = 25
  const modules = generateQRModules(data, qrSize)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${qrSize} ${qrSize}">`
  svg += `<rect width="${qrSize}" height="${qrSize}" fill="white"/>`
  for (let y = 0; y < qrSize; y++) {
    const row = modules[y]
    if (!row) continue
    for (let x = 0; x < qrSize; x++) {
      if (row[x]) {
        svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="black"/>`
      }
    }
  }
  svg += '</svg>'
  return svg
}

function generateQRModules(data: string, qrSize: number): boolean[][] {
  const modules: boolean[][] = Array.from({ length: qrSize }, () => new Array(qrSize).fill(false))

  for (let y = 0; y < qrSize; y++) {
    const row = modules[y]
    if (!row) continue
    for (let x = 0; x < qrSize; x++) {
      let hash = 0
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i)
        hash |= 0
      }
      hash = Math.abs(hash + x * 31 + y * 17)
      row[x] = (hash % 2) === 0
    }
  }

  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const finder = (i === 0 || i === 6 || j === 0 || j === 6) || (i === 2 && j === 2) || (i === 4 && j === 4)
      const row1 = modules[i]
      const row2 = modules[qrSize - 1 - i]
      const row3 = modules[i]
      if (row1) row1[j] = finder
      if (row2) row2[j] = finder
      if (row3) row3[qrSize - 1 - j] = finder
    }
  }

  return modules
}