import { lazy, Suspense, type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { useChannelMute, useChatStore } from '../store/chat'
import { useUsersStore } from '../store/users'
import { emitEditMessage, emitNewMessage } from '../socket'
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_UPLOAD_SIZE,
  uploadFile,
} from '../api/uploads'
import { formatBytes } from '../utils/format'
import { probeFileSize } from '../utils/imageSize'
import GifPicker from './GifPicker'
import type { GiphyGif } from '../api/giphy'
import type { Attachment, Message } from '../types'

const EmojiPicker = lazy(() => import('./EmojiPicker'))

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

type MessageFormProps = {
  channelId: number
  username: string
  editingMessage: Message | null
  onCancelEdit: () => void
  replyingMessage: Message | null
  onCancelReply: () => void
}

function MessageForm({
  channelId,
  username,
  editingMessage,
  onCancelEdit,
  replyingMessage,
  onCancelReply,
}: MessageFormProps) {
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const caretRef = useRef<number | null>(null)
  const setError = useChatStore((state) => state.setError)
  const me = useUsersStore((state) => state.me)
  const mute = useChannelMute(me)
  const [now, setNow] = useState(() => Date.now())
  const COMPOSER_MAX_HEIGHT = 200

  useEffect(() => {
    if (!mute) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [mute])

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

  const mutedUntilMs = mute ? Date.parse(mute.mutedUntil) : Number.NaN
  const muted = Boolean(
    !editingMessage && mute && Number.isFinite(mutedUntilMs) && mutedUntilMs > now,
  )
  const remainingMs = muted ? Math.max(0, mutedUntilMs - now) : 0

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
      const size = file?.type.startsWith('image/') ? await probeFileSize(file) : null
      const uploaded = file ? await uploadFile(file) : undefined
      const attachment = uploaded && size ? { ...uploaded, ...size } : uploaded
      await emitNewMessage(body.trim(), channelId, username, attachment, replyingMessage?.id)
      setBody('')
      setFile(null)
      resetInputHeight()
      onCancelReply()
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
    // GIPHY reports the downsized variant's own box; send it along so the
    // receiver reserves the final size without decoding the file first.
    const width = Number(gif.images.downsized.width)
    const height = Number(gif.images.downsized.height)
    const attachment: Attachment = {
      name: gif.title || 'GIF',
      mime: 'image/gif',
      size: Number(gif.images.downsized.size ?? 0),
      url: gif.images.downsized.url,
      ...(width > 0 && height > 0 ? { width, height } : {}),
    }
    try {
      await emitNewMessage('', channelId, username, attachment, replyingMessage?.id)
      setBody('')
      onCancelReply()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось отправить сообщение')
    }
  }

  return (
    <form
      className={`message-form${editingMessage ? ' editing' : ''}${replyingMessage ? ' replying' : ''}`}
      onSubmit={handleSubmit}
    >
      {editingMessage && (
        <div className="message-form-edit-note">
          <span>Изменение сообщения</span>
          <button type="button" className="icon-btn" onClick={onCancelEdit}>
            Отмена
          </button>
        </div>
      )}
      {replyingMessage && !editingMessage && (
        <div className="message-form-reply-note">
          <span>Ответ для {replyingMessage.username}</span>
          <button type="button" className="icon-btn" onClick={onCancelReply}>
            Отмена
          </button>
        </div>
      )}
      {muted && (
        <div className="message-form-mute-note">
          <span>
            Вы заглушены в этой группе на {mute && remainingMs > 0 ? `… осталось ${formatRemaining(remainingMs)}` : ''}
          </span>
        </div>
      )}
      <div className="message-form-row">
        {!editingMessage && (
          <button
            type="button"
            className="icon-btn"
            title="Прикрепить файл"
            disabled={uploading || muted}
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
            disabled={uploading || muted}
            onClick={() => setPickerOpen(true)}
          >
            GIF
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          title="Вставить эмодзи"
          disabled={uploading || muted}
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
          placeholder={editingMessage ? 'Изменить сообщение...' : replyingMessage ? 'Ответить...' : 'Введите сообщение...'}
          disabled={uploading || muted}
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
