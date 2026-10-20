import { initializeIdentityKeys, rotatePreKeys, getKeyPackage, type E2EEContext } from '@messenger/shared/e2ee'
import { createStores } from '@messenger/shared/crypto/keyStorage'

const stores = createStores('mobile')

export async function initializeE2EE(): Promise<void> {
  await initializeIdentityKeys(
    stores.identity.getIdentityKeyPair,
    stores.identity.saveIdentityKeyPair,
    stores.preKey.getSignedPreKey,
    stores.preKey.saveSignedPreKey,
    stores.preKey.getAllPreKeys,
    stores.preKey.savePreKeys
  )
}

export async function rotateE2EEPreKeys(): Promise<void> {
  await rotatePreKeys(
    stores.preKey.saveSignedPreKey,
    stores.preKey.savePreKeys
  )
}

export function getLocalKeyPackage() {
  return getKeyPackage()
}

export { stores }
export type { E2EEContext }