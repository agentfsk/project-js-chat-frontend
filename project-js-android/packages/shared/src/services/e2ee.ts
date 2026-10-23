import {
  generateIdentityKeyPair,
  generateSignedPreKeyPair,
  generatePreKeyPair,
  generatePreKeyBundle,
  createKeyPackage,
  type IdentityKeyPair,
  type SignedPreKeyPair,
  type PreKeyPair,
  type KeyPackage,
  type PreKeyBundle,
} from '../crypto/x3dh';
import { createWebStores, type IdentityKeyStore, type PreKeyStore } from '../crypto/keyStorage';

const PRE_KEY_COUNT = 100;

let identityKeyPair: IdentityKeyPair | null = null;
let signedPreKeyPair: any = null;
let preKeys: any[] = [];

let identityStore: IdentityKeyStore;
let preKeyStore: PreKeyPair;

async function getStores() {
  const stores = createWebStores();
  identityStore = stores.identity;
  preKeyStore = stores.preKey;
}

async function getStoresSafe() {
  if (!identityStore || !preKeyStore) {
    await getStores();
  }
  return { identityStore, preKeyStore };
}

export async function initializeIdentityKeys(): Promise<void> {
  await getStores();
  const { identityStore, preKeyStore } = await getStoresSafe();

  let ikp = await identityStore.getIdentityKeyPair();
  if (!ikp) {
    ikp = generateIdentityKeyPair();
    await identityStore.saveIdentityKeyPair(ikp);
  }
  identityKeyPair = ikp;

  let spkp = await preKeyStore.getSignedPreKey();
  if (!spkp) {
    spkp = generateSignedPreKeyPair(ikp, Date.now());
    await preKeyStore.saveSignedPreKey(spkp);
  }
  signedPreKeyPair = spkp;

  const existingPreKeys = await preKeyStore.getAllPreKeys();
  if (existingPreKeys.length < PRE_KEY_COUNT) {
    const newPreKeys: any[] = [];
    for (let i = 0; i < PRE_KEY_COUNT - existingPreKeys.length; i++) {
      newPreKeys.push(generatePreKeyPair(Date.now() + i));
    }
    preKeys = [...existingPreKeys, ...newPreKeys];
    await preKeyStore.savePreKeys(preKeys);
  } else {
    preKeys = existingPreKeys;
  }
}

export async function rotatePreKeys(): Promise<void> {
  if (!identityKeyPair) return;
  signedPreKeyPair = generateSignedPreKeyPair(identityKeyPair, Date.now());
  await preKeyStore.saveSignedPreKey(signedPreKeyPair);

  const newPreKeys: any[] = [];
  for (let i = 0; i < PRE_KEY_COUNT; i++) {
    newPreKeys.push(generatePreKeyPair(Date.now() + i));
  }
  preKeys = newPreKeys;
  await preKeyStore.savePreKeys(preKeys);
}

export function getKeyPackage(): any | null {
  if (!identityKeyPair || !signedPreKeyPair || preKeys.length === 0) {
    return null;
  }
  const ephemeralKeyPair = generateIdentityKeyPair();
  const oneTimePreKey = preKeys.shift()!;
  const preKeyBundle = generatePreKeyBundle(identityKeyPair, signedPreKeyPair, preKeys);
  const keyPackage = createKeyPackage(preKeyBundle, ephemeralKeyPair, oneTimePreKey);
  return keyPackage;
}

export function getIdentityKeyPair(): IdentityKeyPair | null {
  return identityKeyPair;
}

export function getSignedPreKeyPair(): any {
  return signedPreKeyPair;
}

export function getPreKeys(): any[] {
  return preKeys;
}