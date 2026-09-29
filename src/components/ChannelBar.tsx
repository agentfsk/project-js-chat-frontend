import { useEffect, useMemo, useState } from 'react'
import { useChatStore } from '../store/chat'
import { buildUnreadIndex, sortByUnread, unreadFor, useUnreadStore } from '../store/unread'
import { useUsersStore } from '../store/users'
import { emitNewChannel, emitRenameChannel, emitRemoveChannel } from '../socket'
import { searchUsers } from '../api/users'
import { channelKind, isGroupChannel, isPrivateConversation } from '../utils/channelKind'
import type { Channel, UserProfile } from '../types'
import Avatar from './Avatar'
import ProfileModal from './ProfileModal'
import ChannelInputModal from './ChannelInputModal'
import RemoveChannelModal from './RemoveChannelModal'
import UnreadBadge from './UnreadBadge'
import CreateGroupModal from './CreateGroupModal'
import GroupInfoModal from './GroupInfoModal'

type Tab = 'private' | 'channels'
type SearchMode = 'chats' | 'users'

type ChannelBarProps = {
  open?: boolean
  onNavigate?: () => void
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

type ChannelRowProps = {
  channel: Channel
  active: boolean
  unread: number
  onSelect: () => void
}

function ChannelRow({ channel, active, unread, onSelect }: ChannelRowProps) {
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
        <UnreadBadge count={unread} />
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
  unread: number
  onSelect: () => void
}

function DmRow({ channel, active, unread, onSelect }: DmRowProps) {
  const me = useUsersStore((state) => state.me)
  const profiles = useUsersStore((state) => state.profiles)
  const contacts = useUsersStore((state) => state.contacts)
  const [profileOpen, setProfileOpen] = useState(false)
  const peerId = channel.participants?.find((id) => id !== me?.id)
  const peer = peerId !== undefined ? profiles[peerId] : undefined
  const isContact = peerId !== undefined && contacts.some((contact) => contact.id === peerId)

  return (
    <li className={`channel-item${active ? ' active' : ''}${isContact ? '' : ' dm-noncontact'}`}>
      <button
        type="button"
        className="channel-avatar-btn"
        aria-label={`Профиль ${peer?.username ?? channel.name}`}
        onClick={() => setProfileOpen(true)}
      >
        <Avatar username={peer?.username ?? channel.name} src={peer?.avatarUrl} />
      </button>
      <button type="button" className="channel-name" onClick={onSelect}>
        <span className="dm-name">{peer?.username ?? channel.name}</span>
        {!isContact && <span className="dm-badge">не в контактах</span>}
        <UnreadBadge count={unread} />
      </button>
      {profileOpen && peer && <ProfileModal profile={peer} onClose={() => setProfileOpen(false)} />}
    </li>
  )
}

type GroupRowProps = {
  channel: Channel
  active: boolean
  unread: number
  onSelect: () => void
  onInfo: () => void
}

function GroupRow({ channel, active, unread, onSelect, onInfo }: GroupRowProps) {
  return (
    <li className={`channel-item${active ? ' active' : ''}`}>
      <button type="button" className="channel-avatar-btn" aria-label="О группе" onClick={onInfo}>
        <Avatar username={channel.name} src={channel.avatarUrl} />
      </button>
      <button type="button" className="channel-name" onClick={onSelect}>
        <span className="dm-name">{channel.name}</span>
        <UnreadBadge count={unread} />
      </button>
      <span className="channel-actions">
        <button type="button" className="icon-btn" title="О группе" onClick={onInfo}>
          …
        </button>
      </span>
    </li>
  )
}

function ChannelBar({ open = false, onNavigate }: ChannelBarProps) {
  const channels = useChatStore((state) => state.channels)
  const currentChannelId = useChatStore((state) => state.currentChannelId)
  const setActiveChannel = useChatStore((state) => state.setActiveChannel)
  const setError = useChatStore((state) => state.setError)
  const [tab, setTab] = useState<Tab>('channels')
  const [creating, setCreating] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [infoChannelId, setInfoChannelId] = useState<number | null>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>('chats')
  const [plusOpen, setPlusOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [selected, setSelected] = useState<UserProfile | null>(null)

  const handleSelectChannel = (id: number) => {
    setActiveChannel(id)
    onNavigate?.()
  }

  const privateChannels = channels.filter((channel) => isPrivateConversation(channel))
  const publicChannels = channels.filter((channel) => channelKind(channel) === 'public')

  const me = useUsersStore((state) => state.me)
  const profiles = useUsersStore((state) => state.profiles)

  // One pass over the messages feeds every badge, both tab totals and both
  // orderings, so an arriving message re-renders the sidebar once instead of
  // once per row.
  const firstSeenAt = useUnreadStore((state) => state.firstSeenAt)
  const lastReadAtByChannel = useUnreadStore((state) => state.lastReadAtByChannel)
  const allMessages = useChatStore((state) => state.messages)
  const myId = me?.id ?? null

  const unreadIndex = useMemo(
    () => buildUnreadIndex(allMessages, firstSeenAt, lastReadAtByChannel, myId),
    [allMessages, firstSeenAt, lastReadAtByChannel, myId],
  )

  // Busiest conversation on top; on a tie the one that reached that count
  // earlier. Replaces the old contacts-first order, which pushed a non-contact
  // with unread mail below read contacts.
  const sortedPrivateChannels = useMemo(
    () => sortByUnread(privateChannels, unreadIndex),
    [privateChannels, unreadIndex],
  )
  const sortedPublicChannels = useMemo(
    () => sortByUnread(publicChannels, unreadIndex),
    [publicChannels, unreadIndex],
  )

  const trimmedQuery = query.trim()

  // «Поиск чатов» filters the ordered list in place by group name or peer
  // username; «Поиск пользователей» hits the directory API. Filtering never
  // reorders, so what is left keeps its unread order.
  const filteredPrivate = trimmedQuery
    ? sortedPrivateChannels.filter((channel) => {
        if (isGroupChannel(channel)) {
          return channel.name.toLowerCase().includes(trimmedQuery.toLowerCase())
        }
        const peerId = channel.participants?.find((id) => id !== me?.id)
        const peer = peerId !== undefined ? profiles[peerId] : undefined
        return (peer?.username ?? channel.name).toLowerCase().includes(trimmedQuery.toLowerCase())
      })
    : sortedPrivateChannels

  useEffect(() => {
    if (searchMode !== 'users') return
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
  }, [query, searchMode])

  const showUserResults = searchMode === 'users' && trimmedQuery.length > 0 && searched === trimmedQuery

  // Tab totals sum the same index the badges read, non-contacts included, so
  // the sidebar never hides unread work behind a tab the user has not opened.
  const sumUnread = (list: Channel[]): number =>
    list.reduce((sum, channel) => sum + unreadFor(unreadIndex, channel.id), 0)

  const privateTotal = sumUnread(privateChannels)
  const channelsTotal = sumUnread(publicChannels)

  const handleCreate = async (name: string) => {
    try {
      await emitNewChannel(name.trim())
      setCreating(false)
    } catch (error) {
      setError(errorMessage(error, 'Не удалось создать канал'))
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setPlusOpen(false)
  }

  const startUserSearch = () => {
    setPlusOpen(false)
    setSearchMode('users')
  }

  const exitUserSearch = () => {
    setSearchMode('chats')
    setQuery('')
    setSearched('')
    setResults([])
  }

  return (
    <aside className={`channel-bar${open ? ' drawer-open' : ''}`}>
      <div className="sidebar-tabs">
        <button
          type="button"
          className={`sidebar-tab${tab === 'private' ? ' active' : ''}`}
          onClick={() => switchTab('private')}
        >
          Личные
          <UnreadBadge count={privateTotal} />
        </button>
        <button
          type="button"
          className={`sidebar-tab${tab === 'channels' ? ' active' : ''}`}
          onClick={() => switchTab('channels')}
        >
          Каналы
          <UnreadBadge count={channelsTotal} />
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
            {sortedPublicChannels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                active={channel.id === currentChannelId}
                unread={unreadFor(unreadIndex, channel.id)}
                onSelect={() => handleSelectChannel(channel.id)}
              />
            ))}
          </ul>
        </>
      )}

      {tab === 'private' && (
        <>
          <div className="channel-bar-head">
            <span className="channel-bar-title">Личные</span>
            <div className="plus-wrap">
              {searchMode === 'users' && <span className="search-mode-chip">Поиск пользователей</span>}
              <button
                type="button"
                className="icon-btn"
                title="Добавить"
                onClick={() => setPlusOpen((open) => !open)}
              >
                +
              </button>
              {plusOpen && (
                <div className="plus-popover">
                  <button type="button" onClick={startUserSearch}>
                    Найти друзей
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlusOpen(false)
                      setCreatingGroup(true)
                    }}
                  >
                    Создать группу
                  </button>
                </div>
              )}
            </div>
          </div>
          <input
            className="search-input"
            type="search"
            placeholder={searchMode === 'users' ? 'Поиск пользователей' : 'Поиск чатов'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {searchMode === 'users' && (
            <button type="button" className="search-mode-back" onClick={exitUserSearch}>
              ← к чатам
            </button>
          )}
          {showUserResults ? (
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
              {filteredPrivate.length === 0 && (
                <li className="search-empty">
                  {trimmedQuery
                    ? 'Ничего не найдено'
                    : searchMode === 'users'
                      ? 'Пока нет личных чатов'
                      : 'Пока нет личных чатов'}
                </li>
              )}
              {filteredPrivate.map((channel) =>
                isGroupChannel(channel) ? (
                  <GroupRow
                    key={channel.id}
                    channel={channel}
                    active={channel.id === currentChannelId}
                    unread={unreadFor(unreadIndex, channel.id)}
                    onSelect={() => handleSelectChannel(channel.id)}
                    onInfo={() => setInfoChannelId(channel.id)}
                  />
                ) : (
                  <DmRow
                    key={channel.id}
                    channel={channel}
                    active={channel.id === currentChannelId}
                    unread={unreadFor(unreadIndex, channel.id)}
                    onSelect={() => handleSelectChannel(channel.id)}
                  />
                ),
              )}
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
      {creatingGroup && <CreateGroupModal onClose={() => setCreatingGroup(false)} />}
      {infoChannelId !== null && (
        <GroupInfoModal channelId={infoChannelId} onClose={() => setInfoChannelId(null)} />
      )}
      {selected && <ProfileModal profile={selected} onClose={() => setSelected(null)} />}
    </aside>
  )
}

export default ChannelBar