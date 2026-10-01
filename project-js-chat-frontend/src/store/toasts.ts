import { create } from 'zustand'
import type { Message } from '../types'

export const TOAST_LIMIT = 3
export const TOAST_PREVIEW_LENGTH = 60
export const TOAST_TTL_MS = 4500

export type Toast = {
  id: number
  channelId: number
  sender: string
  preview: string
}

type ToastState = {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => number
  dismiss: (id: number) => void
  dismissChannel: (channelId: number) => void
  clear: () => void
}

let nextId = 1

// A single incoming burst must never bury the composer, so the oldest notice is
// dropped once the stack is full instead of the stack growing without bound.
export function toastPreview(body: string, attachmentKind: string | null): string {
  const trimmed = body.trim()
  if (trimmed) {
    return trimmed.length > TOAST_PREVIEW_LENGTH ? `${trimmed.slice(0, TOAST_PREVIEW_LENGTH)}…` : trimmed
  }
  return attachmentKind ?? ''
}

// An attachment-only message still needs something to show, so it is described
// by kind rather than as empty text.
export function attachmentKind(mime: string | undefined): string {
  if (!mime) return 'Файл'
  if (mime === 'image/gif') return 'GIF'
  if (mime.startsWith('image/')) return 'Изображение'
  if (mime.startsWith('video/')) return 'Видео'
  if (mime.startsWith('audio/')) return 'Аудио'
  return 'Файл'
}

// A notice stands in for the conversation the reader is not looking at. Silence
// everywhere else: the open channel and the reader's own messages are already
// on screen. An unknown reader cannot be compared, so nothing is announced.
export function shouldAnnounce(message: Message, meId: number | null, currentChannelId: number | null): boolean {
  if (meId === null) return false
  if (message.userId === meId) return false
  return message.channelId !== currentChannelId
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId
    nextId += 1
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-TOAST_LIMIT) }))
    return id
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  dismissChannel: (channelId) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.channelId !== channelId) })),
  clear: () => set({ toasts: [] }),
}))
