import { describe, it, expect } from 'vitest'
import {
  computeSafetyNumber,
  formatSafetyNumber,
  parseSafetyNumber,
  generateQRData,
  generateQRCodeSVG,
  SAFETY_NUMBER_BITS,
  SAFETY_NUMBER_GROUPS,
  SAFETY_NUMBER_DIGITS_PER_GROUP,
} from './safetyNumber'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

describe('safetyNumber', () => {
  const identityKeyA = hexToBytes('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
  const identityKeyB = hexToBytes('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210')

  describe('computeSafetyNumber', () => {
    it('computes deterministic 60-bit fingerprint', () => {
      const sn1 = computeSafetyNumber(identityKeyA, identityKeyB)
      const sn2 = computeSafetyNumber(identityKeyA, identityKeyB)
      expect(sn1).toBe(sn2)
    })

    it('is commutative (order independent)', () => {
      const sn1 = computeSafetyNumber(identityKeyA, identityKeyB)
      const sn2 = computeSafetyNumber(identityKeyB, identityKeyA)
      expect(sn1).toBe(sn2)
    })

    it('produces different fingerprints for different keys', () => {
      const identityKeyC = hexToBytes('1111111111111111111111111111111111111111111111111111111111111111')
      const sn1 = computeSafetyNumber(identityKeyA, identityKeyB)
      const sn2 = computeSafetyNumber(identityKeyA, identityKeyC)
      expect(sn1).not.toBe(sn2)
    })

    it('fits within 60 bits', () => {
      const sn = computeSafetyNumber(identityKeyA, identityKeyB)
      expect(sn < (1n << 60n)).toBe(true)
    })

    it('handles zero keys', () => {
      const zeroKey = new Uint8Array(32)
      const sn = computeSafetyNumber(zeroKey, zeroKey)
      expect(sn >= 0n).toBe(true)
      expect(sn < (1n << 60n)).toBe(true)
    })
  })

  describe('formatSafetyNumber', () => {
    it('formats as 5 groups of 4 digits', () => {
      const sn = 123456789012345n
      const formatted = formatSafetyNumber(sn)
      const groups = formatted.split(' ')
      expect(groups).toHaveLength(5)
      groups.forEach(g => {
        expect(g.length).toBe(4)
        expect(/^\d{4}$/.test(g)).toBe(true)
      })
    })

    it('pads with leading zeros', () => {
      const sn = 42n
      const formatted = formatSafetyNumber(sn)
      expect(formatted).toBe('0000 0000 0000 0000 0042')
    })

    it('handles max 60-bit value', () => {
      const max = (1n << 60n) - 1n
      const formatted = formatSafetyNumber(max)
      const groups = formatted.split(' ')
      expect(groups).toHaveLength(5)
      // Max 60-bit value = 1152921504606846975
      // As decimal: 1152921504606846975 (19 digits) -> padded to 20 digits: 01152921504606846975
      // Groups: 0115 2921 5046 0684 6975
      expect(groups[0]).toBe('0115')
      expect(groups[1]).toBe('2921')
      expect(groups[2]).toBe('5046')
      expect(groups[3]).toBe('0684')
      expect(groups[4]).toBe('6975')
    })

    it('roundtrips with parseSafetyNumber', () => {
      const original = 123456789012345n
      const formatted = formatSafetyNumber(original)
      const parsed = parseSafetyNumber(formatted)
      expect(parsed).toBe(original)
    })
  })

  describe('parseSafetyNumber', () => {
    it('parses correctly formatted string', () => {
      const parsed = parseSafetyNumber('0000 0000 0000 0001 2345')
      expect(parsed).toBe(12345n)
    })

    it('ignores extra whitespace', () => {
      const parsed1 = parseSafetyNumber('0000 0000 0000 0001 2345')
      const parsed2 = parseSafetyNumber('  0000  0000  0000  0001  2345  ')
      expect(parsed1).toBe(parsed2)
    })

    it('throws on wrong number of digits', () => {
      expect(() => parseSafetyNumber('0000 0000 0000 0001')).toThrow('Invalid safety number format')
      expect(() => parseSafetyNumber('0000 0000 0000 0001 2345 6789')).toThrow('Invalid safety number format')
    })

    it('throws on non-numeric characters', () => {
      expect(() => parseSafetyNumber('0000 0000 0000 0001 234a')).toThrow('Invalid safety number format')
    })
  })

  describe('generateQRData', () => {
    it('generates correct URI format', () => {
      const sn = 123456789012345n
      const username = 'alice'
      const qrData = generateQRData(sn, username)
      expect(qrData).toBe('messenger://verify?fp=7048860ddf79&user=alice')
    })

    it('generates correct URI format with computed safety number', () => {
      const identityKeyA = hexToBytes('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
      const identityKeyB = hexToBytes('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210')
      const sn = computeSafetyNumber(identityKeyA, identityKeyB)
      const username = 'alice'
      const qrData = generateQRData(sn, username)
      expect(qrData).toContain('messenger://verify?fp=')
      expect(qrData).toContain('&user=alice')
    })

    it('encodes special characters in username', () => {
      const sn = 42n
      const username = 'alice bob'
      const qrData = generateQRData(sn, username)
      expect(qrData).toContain('user=alice%20bob')
    })

    it('uses lowercase hex for fingerprint', () => {
      const sn = 0xABCDEF123456n
      const qrData = generateQRData(sn, 'test')
      expect(qrData).toContain('fp=abcdef123456')
    })
  })

  describe('generateQRCodeSVG', () => {
    it('generates valid SVG', () => {
      const svg = generateQRCodeSVG('test data', 200)
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('width="200"')
      expect(svg).toContain('height="200"')
    })

    it('contains rect elements for modules', () => {
      const svg = generateQRCodeSVG('test', 100)
      const rectCount = (svg.match(/<rect/g) || []).length
      expect(rectCount).toBeGreaterThan(0)
    })

    it('uses default size when not specified', () => {
      const svg = generateQRCodeSVG('test')
      expect(svg).toContain('width="200"')
      expect(svg).toContain('height="200"')
    })
  })

  describe('Constants', () => {
    it('has correct constant values', () => {
      expect(SAFETY_NUMBER_BITS).toBe(60)
      expect(SAFETY_NUMBER_GROUPS).toBe(5)
      expect(SAFETY_NUMBER_DIGITS_PER_GROUP).toBe(4)
    })
  })
})