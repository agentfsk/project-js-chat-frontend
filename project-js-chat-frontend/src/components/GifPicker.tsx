import { useEffect, useState } from 'react'
import Modal from './Modal'
import { searchGifs, trendingGifs, type GiphyGif } from '../api/giphy'

type GifPickerProps = {
  onSelect: (gif: GiphyGif) => void
  onClose: () => void
}

function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = trimmed ? await searchGifs(trimmed) : await trendingGifs()
        if (!cancelled) {
          setGifs(result)
          setLoading(false)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Не удалось загрузить GIF')
          setLoading(false)
        }
      }
    }

    if (trimmed === '') {
      void run()
    } else {
      const timer = window.setTimeout(() => {
        void run()
      }, 300)
      return () => {
        cancelled = true
        window.clearTimeout(timer)
      }
    }

    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <Modal title="Выберите GIF" onClose={onClose} wide>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск GIF..."
        autoFocus
      />
      {error && <p className="form-error modal-text">{error}</p>}
      {loading && <p className="modal-text gif-picker-status">Загрузка...</p>}
      {!loading && !error && gifs.length === 0 && (
        <p className="modal-text gif-picker-status">Ничего не найдено</p>
      )}
      {!loading && !error && gifs.length > 0 && (
        <div className="gif-picker-grid">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              className="gif-picker-item"
              title={gif.title || 'GIF'}
              onClick={() => onSelect(gif)}
            >
              <img src={gif.images.preview_gif.url} alt={gif.title || 'GIF'} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p className="gif-picker-credit">Powered by GIPHY</p>
    </Modal>
  )
}

export default GifPicker