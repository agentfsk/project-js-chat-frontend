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

export type ToastState = {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => number
  dismiss: (id: number) => void
  dismissChannel: (channelId: number) => void
  clear: () => void
}

let nextId = 1

export function toastPreview(body: string, attachmentKind: string | null): string {
  const trimmed = body.trim()
  if (trimmed) {
    return trimmed.length > TOAST_PREVIEW_LENGTH ? `${trimmed.slice(0, TOAST_PREVIEW_LENGTH)}…` : trimmed
  }
  return attachmentKind ?? ''
}

export function attachmentKind(mime: string | undefined): string {
  if (!mime) return 'Файл'
  if (mime === 'image/gif') return 'GIF'
  if (mime.startsWith('image/')) return 'Изображение'
  if (mime.startsWith('video/')) return 'Видео'
  if (mime.startsWith('audio/')) return 'Аудио'
  return 'Файл'
}

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