export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

export function createWebStorage(): StorageAdapter {
  if (typeof window === 'undefined' || !window.localStorage) {
    const memory = new Map<string, string>()
    return {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => { memory.set(key, value) },
      removeItem: async (key) => { memory.delete(key) },
    }
  }
  return {
    getItem: async (key) => window.localStorage.getItem(key),
    setItem: async (key, value) => { window.localStorage.setItem(key, value) },
    removeItem: async (key) => { window.localStorage.removeItem(key) },
  }
}

export function createAsyncStorage(): StorageAdapter {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    return {
      getItem: async (key) => AsyncStorage.getItem(key),
      setItem: async (key, value) => AsyncStorage.setItem(key, value),
      removeItem: async (key) => AsyncStorage.removeItem(key),
    }
  } catch {
    const memory = new Map<string, string>()
    return {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => { memory.set(key, value) },
      removeItem: async (key) => { memory.delete(key) },
    }
  }
}

export function createSecureStore(): StorageAdapter {
  try {
    const SecureStore = require('expo-secure-store')
    return {
      getItem: async (key) => SecureStore.getItemAsync(key),
      setItem: async (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: async (key) => SecureStore.deleteItemAsync(key),
    }
  } catch {
    return createAsyncStorage()
  }
}