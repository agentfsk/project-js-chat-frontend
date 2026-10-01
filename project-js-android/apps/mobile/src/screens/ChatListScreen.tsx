import React, { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { useChatStore, selectActiveChannelMessages } from '@shared/store/chat'
import { useUnreadStore, buildUnreadIndex, unreadFor, formatUnread, sortByUnread } from '@shared/store/unread'
import { useUsersStore } from '@shared/store/users'
import { useAuthStore } from '@shared/store/auth'
import { createDataApi } from '@shared/api'
import { BACKEND_URL } from '../config'

type RootStackParamList = {
  Chat: { channelId: number }
}

export function ChatListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const { channels, messages, currentChannelId, setInitialData, setActiveChannel, addChannel } = useChatStore()
  const { firstSeenAt, lastReadAtByChannel, setReadState } = useUnreadStore()
  const { me, contacts, requests, outgoingRequests, setInitialData: setUsersInitialData } = useUsersStore()
  const token = useAuthStore((state) => state.token)

  const dataApi = createDataApi(async (path, options) => {
    const res = await fetch(`${BACKEND_URL}${path}`, options)
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    return res.json()
  })

  useEffect(() => {
    if (!token) return
    dataApi.fetchData().then((data) => {
      setInitialData(data.channels, data.messages, data.currentChannelId)
      setReadState(data.readState)
      setUsersInitialData(data.me, data.contacts, data.requests, data.outgoingRequests)
    }).catch((err) => Alert.alert('Ошибка', err.message))
  }, [token])

  const unreadIndex = buildUnreadIndex(messages, firstSeenAt, lastReadAtByChannel, me?.id ?? null)
  const sortedChannels = sortByUnread(channels, unreadIndex)

  const renderChannel = ({ item }: { item: any }) => {
    const unreadCount = unreadFor(unreadIndex, item.id)
    const lastMessage = messages.filter((m) => m.channelId === item.id).pop()
    return (
      <TouchableOpacity
        style={styles.channelRow}
        onPress={() => { setActiveChannel(item.id); navigation.navigate('Chat', { channelId: item.id }); }}
      >
        <View style={styles.avatar}>
          {item.avatarUrl ? <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{item.name[0]}</Text>}
        </View>
        <View style={styles.channelInfo}>
          <Text style={styles.channelName}>{item.name}</Text>
          <Text style={styles.lastMessage}>{lastMessage ? (lastMessage.username === me?.username ? 'Вы: ' : '') + (lastMessage.attachment ? '📎 ' + lastMessage.attachment.name : lastMessage.body) : ''}</Text>
        </View>
        {unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{formatUnread(unreadCount)}</Text></View>}
      </TouchableOpacity>
    )
  }

  if (!token) return null

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedChannels}
        renderItem={renderChannel}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>Нет чатов. Нажмите + чтобы создать.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  channelRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#0f1115' },
  channelInfo: { flex: 1 },
  channelName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastMessage: { color: '#888', fontSize: 14, marginTop: 2 },
  unreadBadge: { backgroundColor: '#7dd3fc', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  unreadText: { color: '#0f1115', fontSize: 12, fontWeight: 'bold' },
  empty: { color: '#888', textAlign: 'center', marginTop: 32 },
})