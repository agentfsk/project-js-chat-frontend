import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { fetchData } from '../api/data'
import { ApiError } from '../api/client'
import { connectSocket, disconnectSocket } from '../socket'
import { useChatStore, selectActiveChannelMessages } from '../store/chat'
import { useAuthStore } from '../store/auth'
import ChannelBar from '../components/ChannelBar'
import MessageList from '../components/MessageList'
import MessageForm from '../components/MessageForm'

function ChatPage() {
  const channels = useChatStore((state) => state.channels)
  const currentChannelId = useChatStore((state) => state.currentChannelId)
  const error = useChatStore((state) => state.error)
  const setInitialData = useChatStore((state) => state.setInitialData)
  const username = useAuthStore((state) => state.username) ?? ''
  const logout = useAuthStore((state) => state.clear)
  const messages = useChatStore(useShallow(selectActiveChannelMessages))

  useEffect(() => {
    connectSocket()
    void fetchData()
      .then((data) => setInitialData(data.channels, data.messages, data.currentChannelId))
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

  return (
    <div className="chat-page">
      <header className="chat-header">
        <h1>Мессенджер</h1>
        <button type="button" onClick={logout}>
          Выйти
        </button>
      </header>
      <div className="chat-body">
        <ChannelBar />
        <main className="chat-main">
          {error && <div className="app-error">{error}</div>}
          {activeChannel && <h2 className="channel-title">#{activeChannel.name}</h2>}
          <MessageList messages={messages} />
          {activeChannel && <MessageForm channelId={activeChannel.id} username={username} />}
        </main>
      </div>
    </div>
  )
}

export default ChatPage