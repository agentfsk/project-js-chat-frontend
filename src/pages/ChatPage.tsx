import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { fetchData } from '../api/data'
import { ApiError } from '../api/client'
import { connectSocket, disconnectSocket, emitDeleteMessage, emitPinMessage } from '../socket'
import { useChatStore, selectActiveChannelMessages, selectPinnedMessage } from '../store/chat'
import { useUsersStore } from '../store/users'
import { useAuthStore } from '../store/auth'
import ChannelBar from '../components/ChannelBar'
import MessageList, { type MessageListHandle } from '../components/MessageList'
import MessageForm from '../components/MessageForm'
import ContactRequestBanner from '../components/ContactRequestBanner'
import PinnedMessageBanner from '../components/PinnedMessageBanner'
import EditProfileModal from '../components/EditProfileModal'
import ThemeToggle from '../components/ThemeToggle'
import Avatar from '../components/Avatar'
import type { Message } from '../types'

const MOBILE_QUERY = '(max-width: 700px)'

function ChatPage() {
  const channels = useChatStore((state) => state.channels)
  const currentChannelId = useChatStore((state) => state.currentChannelId)
  const error = useChatStore((state) => state.error)
  const setInitialData = useChatStore((state) => state.setInitialData)
  const username = useAuthStore((state) => state.username) ?? ''
  const logout = useAuthStore((state) => state.clear)

  const me = useUsersStore((state) => state.me)
  const requests = useUsersStore((state) => state.requests)
  const messages = useChatStore(useShallow(selectActiveChannelMessages))
  const pinnedMessage = useChatStore(useShallow(selectPinnedMessage))
  const [editingProfile, setEditingProfile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const messageListRef = useRef<MessageListHandle>(null)
  const setError = useChatStore((state) => state.setError)
  const editingMessage = messages.find((m) => m.id === editingMessageId) ?? null

  useEffect(() => {
    connectSocket()
    void fetchData()
      .then((data) => {
        setInitialData(data.channels, data.messages, data.currentChannelId)
        useUsersStore.getState().setInitialData(data.me, data.contacts, data.requests)
      })
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.status === 401) {
          return
        }
        useChatStore.getState().setError(
          caught instanceof Error ? caught.message : 'Не удалось загрузить данные',
        )
      })
    return disconnectSocket
  }, [setInitialData])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const handleChange = () => {
      if (!media.matches) setDrawerOpen(false)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (editingMessageId !== null) {
      messageListRef.current?.scrollToMessage(editingMessageId)
    }
  }, [editingMessageId])

  const activeChannel = channels.find((channel) => channel.id === currentChannelId) ?? null
  const pendingRequest =
    activeChannel?.private && activeChannel.id !== undefined
      ? (requests.find((request) => request.channelId === activeChannel.id) ?? null)
      : null

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id)
  }

  const handleDelete = (message: Message) => {
    emitDeleteMessage(message.id).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Не удалось удалить сообщение')
    })
  }

  const handlePinToggle = (message: Message) => {
    emitPinMessage(message.id, !message.pinned).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Не удалось закрепить сообщение')
    })
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-header-left">
          <button
            type="button"
            className="icon-btn burger-btn"
            aria-label="Открыть список каналов"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
          <h1>Мессенджер</h1>
        </div>
        <div className="chat-header-right">
          <ThemeToggle />
          {me && (
            <button type="button" className="profile-entry" onClick={() => setEditingProfile(true)}>
              <Avatar username={me.username} src={me.avatarUrl} size={28} />
              <span>{me.username}</span>
            </button>
          )}
          <button type="button" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
      <div className="chat-body">
        <ChannelBar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
        <main className="chat-main">
          {error && <div className="app-error">{error}</div>}
          {activeChannel && (
            <h2 className="channel-title">{activeChannel.private ? activeChannel.name : `#${activeChannel.name}`}</h2>
          )}
          {pendingRequest && <ContactRequestBanner request={pendingRequest} />}
          <PinnedMessageBanner
            message={pinnedMessage}
            onNavigate={() => {
              if (pinnedMessage) messageListRef.current?.scrollToMessage(pinnedMessage.id)
            }}
          />
          <MessageList
            ref={messageListRef}
            messages={messages}
            channel={activeChannel}
            me={me}
            editingId={editingMessage?.id ?? null}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPinToggle={handlePinToggle}
          />
          {activeChannel && (
            <MessageForm
              channelId={activeChannel.id}
              username={username}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessageId(null)}
            />
          )}
        </main>
      </div>
      {editingProfile && <EditProfileModal onClose={() => setEditingProfile(false)} />}
    </div>
  )
}

export default ChatPage