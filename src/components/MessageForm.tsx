import { lazy, Suspense, type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { useChatStore } from '../store/chat'
import { emitEditMessage, emitNewMessage } from '../socket'
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_UPLOAD_SIZE,
  uploadFile,
} from '../api/uploads'
import { formatBytes } from '../utils/format'
import GifPicker from './GifPicker'
import type { GiphyGif } from '../api/giphy'
import type { Attachment, Message } from '../types'

const EmojiPicker = lazy(() => import('./EmojiPicker'))

type MessageFormProps = {
  channelId: number
  username: string
  editingMessage: Message | null
  onCancelEdit: () => void
}

function MessageForm({ channelId, username, editingMessage, onCancelEdit }: MessageFormProps) {
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const caretRef = useRef<number | null>(null)
  const setError = useChatStore((state) => state.setError)
  const COMPOSER_MAX_HEIGHT = 200

  const syncInputHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
  }

  useEffect(() => {
    setBody(editingMessage?.body ?? '')
    setFile(null)
    setError(null)
    setEmojiOpen(false)
    setPickerOpen(false)
    const input = inputRef.current
    if (editingMessage && input) {
      input.focus()
      syncInputHeight(input)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id])

  const resetInputHeight = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
  }

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

    if (editingMessage) {
      if (!body.trim()) return
      try {
        await emitEditMessage(editingMessage.id, body.trim())
        onCancelEdit()
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Не удалось изменить сообщение')
      }
      return
    }

    if (!canSubmit) return

    setUploading(true)
    try {
      const attachment = file ? await uploadFile(file) : undefined
      await emitNewMessage(body.trim(), channelId, username, attachment)
      setBody('')
      setFile(null)
      resetInputHeight()
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
      syncInputHeight(input)
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
    <form className={`message-form${editingMessage ? ' editing' : ''}`} onSubmit={handleSubmit}>
      {editingMessage && (
        <div className="message-form-edit-note">
          <span>Изменение сообщения</span>
          <button type="button" className="icon-btn" onClick={onCancelEdit}>
            Отмена
          </button>
        </div>
      )}
      <div className="message-form-row">
        {!editingMessage && (
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
        )}
        {!editingMessage && (
          <button
            type="button"
            className="icon-btn"
            title="Отправить GIF"
            disabled={uploading}
            onClick={() => setPickerOpen(true)}
          >
            GIF
          </button>
        )}
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
        <textarea
          ref={inputRef}
          value={body}
          rows={1}
          onChange={(event) => {
            setBody(event.target.value)
            caretRef.current = event.target.selectionStart
            syncInputHeight(event.target)
          }}
          placeholder={editingMessage ? 'Изменить сообщение...' : 'Введите сообщение...'}
          disabled={uploading}
        />
        {editingMessage ? (
          <button type="submit" className="send-btn" title="Сохранить" disabled={!body.trim()}>
            <span className="send-label">Сохранить</span>
          </button>
        ) : (
          <button type="submit" className="send-btn" title="Отправить" disabled={!canSubmit}>
            <span className="send-icon" aria-hidden="true">
              {uploading ? '…' : '→'}
            </span>
            <span className="send-label">{uploading ? 'Загрузка...' : 'Отправить'}</span>
          </button>
        )}
      </div>
      {file && !editingMessage && (
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
