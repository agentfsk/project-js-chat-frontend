import { lazy, Suspense, type ChangeEvent, type FormEvent, useRef, useState } from 'react'
import { useChatStore } from '../store/chat'
import { emitNewMessage } from '../socket'
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_UPLOAD_SIZE,
  uploadFile,
} from '../api/uploads'
import { formatBytes } from '../utils/format'
import GifPicker from './GifPicker'
import type { GiphyGif } from '../api/giphy'
import type { Attachment } from '../types'

const EmojiPicker = lazy(() => import('./EmojiPicker'))

type MessageFormProps = {
  channelId: number
  username: string
}

function MessageForm({ channelId, username }: MessageFormProps) {
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)
  const setError = useChatStore((state) => state.setError)

  const canSubmit = !uploading && (body.trim().length > 0 || file !== null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!selected) return
    if (!ALLOWED_ATTACHMENT_TYPES.has(selected.type)) {
      setError('Недопустимый тип файла')
      return
    }
    if (selected.size > MAX_UPLOAD_SIZE) {
      setError('Файл слишком большой (максимум 5 МБ)')
      return
    }
    setFile(selected)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setUploading(true)
    try {
      const attachment = file ? await uploadFile(file) : undefined
      await emitNewMessage(body.trim(), channelId, username, attachment)
      setBody('')
      setFile(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось отправить сообщение')
    } finally {
      setUploading(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current
    if (!input) return
    const caret = caretRef.current ?? input.selectionStart ?? body.length
    const next = body.slice(0, caret) + emoji + body.slice(caret)
    setBody(next)
    const position = caret + emoji.length
    caretRef.current = position
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(position, position)
    })
    setEmojiOpen(false)
  }

  const handleGifSelect = async (gif: GiphyGif) => {
    setPickerOpen(false)
    const attachment: Attachment = {
      name: gif.title || 'GIF',
      mime: 'image/gif',
      size: Number(gif.images.downsized.size ?? 0),
      url: gif.images.downsized.url,
    }
    try {
      await emitNewMessage('', channelId, username, attachment)
      setBody('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось отправить сообщение')
    }
  }

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <div className="message-form-row">
        <button
          type="button"
          className="icon-btn"
          title="Прикрепить файл"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Отправить GIF"
          disabled={uploading}
          onClick={() => setPickerOpen(true)}
        >
          GIF
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Вставить эмодзи"
          disabled={uploading}
          onClick={() => setEmojiOpen((open) => !open)}
        >
          ☺
        </button>
        <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.txt,.md,.json,.csv,.pdf,image/*,text/*,application/json,application/pdf" onChange={handleFileChange} hidden />
        <input
          ref={inputRef}
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
            caretRef.current = event.target.selectionStart
          }}
          placeholder="Введите сообщение..."
          disabled={uploading}
        />
        <button type="submit" disabled={!canSubmit}>
          {uploading ? 'Загрузка...' : 'Отправить'}
        </button>
      </div>
      {file && (
        <div className="attachment-chip">
          <span className="attachment-chip-name">{file.name}</span>
          <span className="attachment-chip-size">{formatBytes(file.size)}</span>
          {!uploading && (
            <button type="button" className="attachment-chip-remove icon-btn" onClick={() => setFile(null)}>
              ×
            </button>
          )}
        </div>
      )}
      {emojiOpen && (
        <Suspense fallback={null}>
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setEmojiOpen(false)} />
        </Suspense>
      )}
      {pickerOpen && (
        <GifPicker onSelect={handleGifSelect} onClose={() => setPickerOpen(false)} />
      )}
    </form>
  )
}

export default MessageForm
