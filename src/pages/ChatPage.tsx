import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { fetchData } from '../api/data'
import { ApiError } from '../api/client'
import { connectSocket, disconnectSocket } from '../socket'
import { useChatStore, selectActiveChannelMessages } from '../store/chat'
import { useUsersStore } from '../store/users'
import { useAuthStore } from '../store/auth'
import ChannelBar from '../components/ChannelBar'
import MessageList from '../components/MessageList'
import MessageForm from '../components/MessageForm'
import ContactRequestBanner from '../components/ContactRequestBanner'
import EditProfileModal from '../components/EditProfileModal'
import Avatar from '../components/Avatar'

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
  const [editingProfile, setEditingProfile] = useState(false)

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

  const activeChannel = channels.find((channel) => channel.id === currentChannelId) ?? null
  const pendingRequest =
    activeChannel?.private && activeChannel.id !== undefined
      ? (requests.find((request) => request.channelId === activeChannel.id) ?? null)
      : null

  return (
    <div className="chat-page">
      <header className="chat-header">
        <h1>Мессенджер</h1>
        <div className="chat-header-right">
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
      <div className="chat-body">
        <ChannelBar />
        <main className="chat-main">
          {error && <div className="app-error">{error}</div>}
          {activeChannel && (
            <h2 className="channel-title">{activeChannel.private ? activeChannel.name : `#${activeChannel.name}`}</h2>
          )}
          {pendingRequest && <ContactRequestBanner request={pendingRequest} />}
          <MessageList messages={messages} />
          {activeChannel && <MessageForm channelId={activeChannel.id} username={username} />}
        </main>
      </div>
      {editingProfile && <EditProfileModal onClose={() => setEditingProfile(false)} />}
    </div>
  )
}

export default ChatPage