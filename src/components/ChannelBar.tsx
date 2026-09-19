import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chat'
import { useUsersStore } from '../store/users'
import { emitNewChannel, emitRenameChannel, emitRemoveChannel } from '../socket'
import { searchUsers } from '../api/users'
import type { Channel, UserProfile } from '../types'
import Avatar from './Avatar'
import ProfileModal from './ProfileModal'
import ChannelInputModal from './ChannelInputModal'
import RemoveChannelModal from './RemoveChannelModal'

type Tab = 'private' | 'channels'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

type ChannelRowProps = {
  channel: Channel
  active: boolean
  onSelect: () => void
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

type DmRowProps = {
  channel: Channel
  active: boolean
  onSelect: () => void
}

function DmRow({ channel, active, onSelect }: DmRowProps) {
  const me = useUsersStore((state) => state.me)
  const profiles = useUsersStore((state) => state.profiles)
  const contacts = useUsersStore((state) => state.contacts)
  const peerId = channel.participants?.find((id) => id !== me?.id)
  const peer = peerId !== undefined ? profiles[peerId] : undefined
  const isContact = peerId !== undefined && contacts.some((contact) => contact.id === peerId)

  return (
    <li className={`channel-item${active ? ' active' : ''}${isContact ? '' : ' dm-noncontact'}`}>
      <Avatar username={channel.name} src={peer?.avatarUrl} />
      <button type="button" className="channel-name" onClick={onSelect}>
        <span className="dm-name">{channel.name}</span>
        {!isContact && <span className="dm-badge">не в контактах</span>}
      </button>
    </li>
  )
}

function ChannelBar() {
  const channels = useChatStore((state) => state.channels)
  const currentChannelId = useChatStore((state) => state.currentChannelId)
  const setActiveChannel = useChatStore((state) => state.setActiveChannel)
  const setError = useChatStore((state) => state.setError)
  const [tab, setTab] = useState<Tab>('channels')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [selected, setSelected] = useState<UserProfile | null>(null)

  const privateChannels = channels.filter((channel) => channel.private)
  const publicChannels = channels.filter((channel) => !channel.private)
  const showResults = query.trim().length > 0 && searched === query.trim()

  const me = useUsersStore((state) => state.me)
  const contacts = useUsersStore((state) => state.contacts)
  const sortedPrivateChannels = [...privateChannels].sort((a, b) => {
    const aPeer = a.participants?.find((id) => id !== me?.id)
    const bPeer = b.participants?.find((id) => id !== me?.id)
    const aContact = aPeer !== undefined && contacts.some((c) => c.id === aPeer)
    const bContact = bPeer !== undefined && contacts.some((c) => c.id === bPeer)
    if (aContact !== bContact) return aContact ? -1 : 1
    return 0
  })

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length === 0) return
    const timer = setTimeout(() => {
      searchUsers(trimmed)
        .then((found) => {
          useUsersStore.getState().upsertProfiles(found)
          setResults(found)
          setSearched(trimmed)
        })
        .catch(() => {
          setResults([])
          setSearched(trimmed)
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

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
      <div className="sidebar-tabs">
        <button
          type="button"
          className={`sidebar-tab${tab === 'private' ? ' active' : ''}`}
          onClick={() => setTab('private')}
        >
          Личные
        </button>
        <button
          type="button"
          className={`sidebar-tab${tab === 'channels' ? ' active' : ''}`}
          onClick={() => setTab('channels')}
        >
          Каналы
        </button>
      </div>

      {tab === 'channels' && (
        <>
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
            {publicChannels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                active={channel.id === currentChannelId}
                onSelect={() => setActiveChannel(channel.id)}
              />
            ))}
          </ul>
        </>
      )}

      {tab === 'private' && (
        <>
          <div className="channel-bar-head">
            <span className="channel-bar-title">Личные</span>
          </div>
          <input
            className="search-input"
            type="search"
            placeholder="Поиск пользователей"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {showResults ? (
            <ul className="channel-list">
              {results.length === 0 && <li className="search-empty">Никого не найдено</li>}
              {results.map((profile) => (
                <li className="channel-item" key={profile.id}>
                  <Avatar username={profile.username} src={profile.avatarUrl} />
                  <button
                    type="button"
                    className="channel-name"
                    onClick={() => setSelected(profile)}
                  >
                    {profile.username}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="channel-list">
              {privateChannels.length === 0 && <li className="search-empty">Пока нет личных чатов</li>}
              {sortedPrivateChannels.map((channel) => (
                <DmRow
                  key={channel.id}
                  channel={channel}
                  active={channel.id === currentChannelId}
                  onSelect={() => setActiveChannel(channel.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {creating && (
        <ChannelInputModal
          title="Создать канал"
          submitLabel="Создать"
          onSubmit={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}
      {selected && <ProfileModal profile={selected} onClose={() => setSelected(null)} />}
    </aside>
  )
}

export default ChannelBar