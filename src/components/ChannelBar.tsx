import { useState } from 'react'
import { useChatStore } from '../store/chat'
import { emitNewChannel, emitRenameChannel, emitRemoveChannel } from '../socket'
import type { Channel } from '../types'
import ChannelInputModal from './ChannelInputModal'
import RemoveChannelModal from './RemoveChannelModal'

type ChannelRowProps = {
  channel: Channel
  active: boolean
  onSelect: () => void
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function ChannelRow({ channel, active, onSelect }: ChannelRowProps) {
  const setError = useChatStore((state) => state.setError)
  const [renaming, setRenaming] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleRename = async (name: string) => {
    try {
      await emitRenameChannel(channel.id, name.trim())
      setRenaming(false)
    } catch (error) {
      setError(errorMessage(error, 'Не удалось переименовать канал'))
    }
  }

  const handleRemove = async () => {
    try {
      await emitRemoveChannel(channel.id)
      setRemoving(false)
    } catch (error) {
      setError(errorMessage(error, 'Не удалось удалить канал'))
    }
  }

  return (
    <li className={`channel-item${active ? ' active' : ''}`}>
      <button type="button" className="channel-name" onClick={onSelect}>
        {channel.name}
      </button>
      {channel.removable && (
        <span className="channel-actions">
          <button
            type="button"
            className="icon-btn"
            title="Переименовать"
            onClick={() => setRenaming(true)}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-btn danger-icon"
            title="Удалить"
            onClick={() => setRemoving(true)}
          >
            ✕
          </button>
        </span>
      )}
      {renaming && (
        <ChannelInputModal
          title="Переименовать канал"
          initialName={channel.name}
          submitLabel="Переименовать"
          onSubmit={handleRename}
          onClose={() => setRenaming(false)}
        />
      )}
      {removing && (
        <RemoveChannelModal channel={channel} onSubmit={handleRemove} onClose={() => setRemoving(false)} />
      )}
    </li>
  )
}

function ChannelBar() {
  const channels = useChatStore((state) => state.channels)
  const currentChannelId = useChatStore((state) => state.currentChannelId)
  const setActiveChannel = useChatStore((state) => state.setActiveChannel)
  const setError = useChatStore((state) => state.setError)
  const [creating, setCreating] = useState(false)

  const handleCreate = async (name: string) => {
    try {
      await emitNewChannel(name.trim())
      setCreating(false)
    } catch (error) {
      setError(errorMessage(error, 'Не удалось создать канал'))
    }
  }

  return (
    <aside className="channel-bar">
      <div className="channel-bar-head">
        <span className="channel-bar-title">Каналы</span>
        <button
          type="button"
          className="icon-btn"
          title="Создать канал"
          onClick={() => setCreating(true)}
        >
          +
        </button>
      </div>
      <ul className="channel-list">
        {channels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            active={channel.id === currentChannelId}
            onSelect={() => setActiveChannel(channel.id)}
          />
        ))}
      </ul>
      {creating && (
        <ChannelInputModal
          title="Создать канал"
          submitLabel="Создать"
          onSubmit={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}
    </aside>
  )
}

export default ChannelBar