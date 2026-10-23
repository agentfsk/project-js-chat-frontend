import { x25519 } from '@noble/curves/ed25519'
import { hkdfSHA256, concatBytes } from './hkdf'

export interface ChainKey {
  key: Uint8Array
  index: number
}

export interface MessageKeys {
  sending: ChainKey
  receiving: ChainKey
  rootKey: Uint8Array
  sendingDH: { privateKey: Uint8Array; publicKey: Uint8Array }
  receivingDH: Uint8Array | null
  previousSendingChainLength: number
}

export const MAX_SKIP = 100

export class DoubleRatchet {
  private state: MessageKeys | null = null
  private skippedMessageKeys: Map<string, Uint8Array> = new Map()

  initialize(rootKey: Uint8Array, sendingDH: { privateKey: Uint8Array; publicKey: Uint8Array }, receivingDH: Uint8Array | null): void {
    const dhSharedSecret = receivingDH ? x25519.getSharedSecret(sendingDH.privateKey, receivingDH) : new Uint8Array(32)
    
    const chainKey = hkdfSHA256(rootKey, dhSharedSecret, new TextEncoder().encode('chain'), 32)

    this.state = {
      sending: { key: chainKey, index: 0 },
      receiving: { key: chainKey, index: 0 },
      rootKey,
      sendingDH,
      receivingDH,
      previousSendingChainLength: 0,
    }
  }

  initializeAsResponder(rootKey: Uint8Array, receivingDH: Uint8Array, sendingDH?: { privateKey: Uint8Array; publicKey: Uint8Array }): void {
    if (sendingDH) {
      this.initialize(rootKey, sendingDH, receivingDH)
    } else {
      const privateKey = x25519.utils.randomPrivateKey()
      const newSendingDH = { privateKey, publicKey: x25519.getPublicKey(privateKey) }
      this.initialize(rootKey, newSendingDH, receivingDH)
    }
  }

  ratchetSend(): { messageKey: Uint8Array; header: { dh: Uint8Array; pn: number; n: number } } {
    if (!this.state) throw new Error('DoubleRatchet not initialized')

    const chainKey = this.state.sending.key
    const messageKey = hkdfSHA256(new Uint8Array(32), chainKey, new TextEncoder().encode('msg'), 32)
    const nextChainKey = hkdfSHA256(new Uint8Array(32), chainKey, new TextEncoder().encode('next'), 32)

    this.state.sending = { key: nextChainKey, index: this.state.sending.index + 1 }

    return {
      messageKey,
      header: {
        dh: this.state.sendingDH.publicKey,
        pn: this.state.previousSendingChainLength,
        n: this.state.sending.index - 1,
      },
    }
  }

  ratchetReceive(header: { dh: Uint8Array; pn: number; n: number }): Uint8Array {
    if (!this.state) throw new Error('DoubleRatchet not initialized')

    const dhRatchet = !this.state.receivingDH || !this.equals(this.state.receivingDH, header.dh)

    if (dhRatchet) {
      this.dhRatchet(header.dh)
    }

    const skipCount = header.n - this.state.receiving.index + 1
    if (skipCount > 0) {
      if (skipCount > MAX_SKIP) throw new Error('Too many skipped messages')
      for (let i = 0; i < skipCount - 1; i++) {
        const skippedKey = this.advanceReceivingChain()
        this.skippedMessageKeys.set(`${this.bytesToHex(header.dh)}:${this.state.receiving.index}`, skippedKey)
      }
    }

    return this.advanceReceivingChain()
  }

  private advanceReceivingChain(): Uint8Array {
    if (!this.state) throw new Error('DoubleRatchet not initialized')
    const chainKey = this.state.receiving.key
    const messageKey = hkdfSHA256(new Uint8Array(32), chainKey, new TextEncoder().encode('msg'), 32)
    const nextChainKey = hkdfSHA256(new Uint8Array(32), chainKey, new TextEncoder().encode('next'), 32)
    this.state.receiving = { key: nextChainKey, index: this.state.receiving.index + 1 }
    return messageKey
  }

  private dhRatchet(newReceivingDH: Uint8Array): void {
    if (!this.state) throw new Error('DoubleRatchet not initialized')

    const sharedSecret = x25519.getSharedSecret(this.state.sendingDH.privateKey, newReceivingDH)
    const newRootKey = hkdfSHA256(this.state.rootKey, sharedSecret, new TextEncoder().encode('root'), 32)

    this.state.previousSendingChainLength = this.state.sending.index
    const privateKey = x25519.utils.randomPrivateKey()
    this.state.sendingDH = { privateKey, publicKey: x25519.getPublicKey(privateKey) }
    this.state.receivingDH = newReceivingDH

    const chainKey = hkdfSHA256(newRootKey, sharedSecret, new TextEncoder().encode('chain'), 32)
    const sendingChainKey = hkdfSHA256(chainKey, new Uint8Array(0), new TextEncoder().encode('send'), 32)
    const receivingChainKey = hkdfSHA256(chainKey, new Uint8Array(0), new TextEncoder().encode('recv'), 32)

    this.state.rootKey = newRootKey
    this.state.sending = { key: sendingChainKey, index: 0 }
    this.state.receiving = { key: receivingChainKey, index: 0 }
  }

  trySkippedMessageKey(header: { dh: Uint8Array; pn: number; n: number }): Uint8Array | null {
    const key = this.skippedMessageKeys.get(`${this.bytesToHex(header.dh)}:${header.n}`)
    if (key) {
      this.skippedMessageKeys.delete(`${this.bytesToHex(header.dh)}:${header.n}`)
      return key
    }
    return null
  }

  getSendingDH(): Uint8Array {
    if (!this.state) throw new Error('DoubleRatchet not initialized')
    return this.state.sendingDH.publicKey
  }

  getRootKey(): Uint8Array {
    if (!this.state) throw new Error('DoubleRatchet not initialized')
    return this.state.rootKey
  }

  private equals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  serialize(): string {
    if (!this.state) return ''
    return JSON.stringify({
      sending: { key: DoubleRatchet.bytesToBase64(this.state.sending.key), index: this.state.sending.index },
      receiving: { key: DoubleRatchet.bytesToBase64(this.state.receiving.key), index: this.state.receiving.index },
      rootKey: DoubleRatchet.bytesToBase64(this.state.rootKey),
      sendingDH: { privateKey: DoubleRatchet.bytesToBase64(this.state.sendingDH.privateKey), publicKey: DoubleRatchet.bytesToBase64(this.state.sendingDH.publicKey) },
      receivingDH: this.state.receivingDH ? DoubleRatchet.bytesToBase64(this.state.receivingDH) : null,
      previousSendingChainLength: this.state.previousSendingChainLength,
    })
  }

  static deserialize(data: string): DoubleRatchet {
    const dr = new DoubleRatchet()
    const parsed = JSON.parse(data)
    dr.state = {
      sending: { key: DoubleRatchet.base64ToBytes(parsed.sending.key), index: parsed.sending.index },
      receiving: { key: DoubleRatchet.base64ToBytes(parsed.receiving.key), index: parsed.receiving.index },
      rootKey: DoubleRatchet.base64ToBytes(parsed.rootKey),
      sendingDH: { privateKey: DoubleRatchet.base64ToBytes(parsed.sendingDH.privateKey), publicKey: DoubleRatchet.base64ToBytes(parsed.sendingDH.publicKey) },
      receivingDH: parsed.receivingDH ? DoubleRatchet.base64ToBytes(parsed.receivingDH) : null,
      previousSendingChainLength: parsed.previousSendingChainLength,
    }
    return dr
  }

  static bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
  }

  static base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  private bytesToBase64(bytes: Uint8Array): string {
    return DoubleRatchet.bytesToBase64(bytes)
  }

  private base64ToBytes(base64: string): Uint8Array {
    return DoubleRatchet.base64ToBytes(base64)
  }
}