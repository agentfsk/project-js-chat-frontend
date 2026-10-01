import React, { useEffect, useRef, useState } from 'react'
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, TouchableOpacity } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { useChatStore, selectActiveChannelMessages } from '@shared/store/chat'
import { useUnreadStore } from '@shared/store/unread'
import { useUsersStore } from '@shared/store/users'
import { emitNewMessage, emitReadChannel } from '@shared/socket'
import { resolveMediaUrl } from '@shared/utils/mediaUrl'
import { REACTION_EMOJIS } from '@shared/data/emoji'
import MessageContextMenu, { type MessageMenuAction } from '../components/MessageContextMenu'
import { BACKEND_URL } from '../config'

type ChatScreenRouteParams = { channelId?: number }
type ChatScreenRouteProp = RouteProp<{ Chat: ChatScreenRouteParams }, 'Chat'>

type DocumentPickerSuccess = DocumentPicker.DocumentPickerSuccessResult
type DocumentPickerCancel = DocumentPicker.DocumentPickerCanceledResult
type DocumentPickerResult = DocumentPicker.DocumentPickerResult

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 10

export function ChatScreen() {
  const navigation = useNavigation()
  const route = useRoute<ChatScreenRouteProp>()
  const { messages, currentChannelId, addMessage, setActiveChannel } = useChatStore()
  const { markChannelRead } = useUnreadStore()
  const { me } = useUsersStore()
  const channelId = route.params?.channelId ?? currentChannelId
  const [text, setText] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const [menu, setMenu] = useState<{ message: any; x: number; y: number } | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressStart = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const channelMessages = selectActiveChannelMessages(useChatStore.getState())

  useEffect(() => {
    if (channelId) {
      setActiveChannel(channelId)
      emitReadChannel(channelId)
      markChannelRead(channelId, new Date().toISOString())
    }
  }, [channelId])

  const sendMessage = async () => {
    if (!text.trim() && !pendingAttachment) return
    if (channelId === null) return
    const currentText = text
    setText('')
    try {
      await emitNewMessage(currentText, channelId, me?.username || '', pendingAttachment)
    } catch (err: any) {
      Alert.alert('Ошибка', err.message)
      setText(currentText)
    } finally {
      setPendingAttachment(null)
    }
  }

  const [pendingAttachment, setPendingAttachment] = useState<any>(null)

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const attachment = await uploadFile(asset.uri, asset.fileName || 'image.jpg', asset.mimeType || 'image/jpeg')
      setPendingAttachment(attachment)
    }
  }

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'application/json', 'image/*'],
      copyToCacheDirectory: true,
    })
    if (!result.canceled) {
      const asset = result.assets[0]
      if (asset) {
        const attachment = await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream')
        setPendingAttachment(attachment)
      }
    }
  }

  const uploadFile = async (uri: string, name: string, type: string) => {
    const formData = new FormData()
    formData.append('file', {
      uri,
      name,
      type,
    } as any)

    const token = require('@shared/store/auth').useAuthStore.getState().token
    const response = await fetch(`${BACKEND_URL}/api/v1/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Ошибка загрузки файла')
    }
    return response.json()
  }

  const buildActions = (message: any): MessageMenuAction[] => {
    const actions: MessageMenuAction[] = [{ id: 'reply', label: 'Ответить' }]
    actions.push({ id: 'copy', label: 'Копировать' })
    return actions
  }

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressStart.current = null
  }

  const handleTouchStart = (message: any, event: any) => {
    const touch = event.nativeEvent.touches?.[0]
    if (!touch) return
    longPressStart.current = { x: touch.locationX, y: touch.locationY, moved: false }
    longPressTimer.current = setTimeout(() => {
      const start = longPressStart.current
      if (!start || start.moved) return
      if (buildActions(message).length === 0) return
      setMenu({ message, x: start.x, y: start.y })
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (event: any) => {
    const start = longPressStart.current
    const touch = event.nativeEvent.touches?.[0]
    if (!start || !touch) return
    if (Math.hypot(touch.locationX - start.x, touch.locationY - start.y) > LONG_PRESS_MOVE_TOLERANCE) {
      start.moved = true
    }
  }

  const handleTouchEnd = () => {
    clearLongPress()
  }

  const copyMessageContent = async (message: any) => {
    try {
      let contentToCopy = ''

      if (message.body) {
        contentToCopy = message.body
      }

      if (message.attachment) {
        const url = resolveMediaUrl(message.attachment.url) ?? message.attachment.url

        if (message.attachment.mime === 'image/gif') {
          contentToCopy = url
        } else if (message.attachment.mime.startsWith('image/')) {
          contentToCopy = url
        } else {
          contentToCopy = url
        }
      }

      if (contentToCopy) {
        await Clipboard.setStringAsync(contentToCopy)
        // Optional: show toast
      }
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }

  const handleMenuSelect = (action: MessageMenuAction) => {
    if (!menu) return
    const { message } = menu
    setMenu(null)
    if (action.id === 'copy') copyMessageContent(message)
  }

  const renderMessage = ({ item }: { item: any }) => {
    const isOwn = item.userId === me?.id
    return (
      <Pressable
        style={[styles.messageContainer, isOwn ? styles.own : styles.other]}
        onPressIn={() => handleTouchStart(item, { nativeEvent: { touches: [{ locationX: 0, locationY: 0 }] } })}
        onPressOut={clearLongPress}
        onPressMove={handleTouchMove}
      >
        <View style={styles.messageBubble}>
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>{item.body}</Text>
          {item.attachment && item.attachment.mime.startsWith('image/') && (
            <Image source={{ uri: `${BACKEND_URL}${item.attachment.url}` }} style={styles.image} />
          )}
        </View>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</Text>
        {menu && menu.message.id === item.id && (
          <MessageContextMenu
            x={menu.x}
            y={menu.y}
            actions={buildActions(item)}
            activeReactions={item.reactions?.filter((r: any) => r.userId === me?.id).map((r: any) => r.emoji) ?? []}
            onReact={(emoji) => {}}
            onSelect={handleMenuSelect}
            onClose={() => setMenu(null)}
          />
        )}
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={channelMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => String(item.id)}
        inverted
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.listContent}
      />
      {pendingAttachment && (
        <View style={styles.attachmentPreview}>
          <Text style={styles.attachmentPreviewText}>{pendingAttachment.name}</Text>
          <TouchableOpacity style={styles.attachmentRemove} onPress={() => setPendingAttachment(null)}>
            <Text>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer} keyboardVerticalOffset={0}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachmentButton} onPress={pickImage}>
            <Text style={styles.attachmentButtonText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentButton} onPress={pickDocument}>
            <Text style={styles.attachmentButtonText}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Сообщение..."
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={!text.trim() && !pendingAttachment}>
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  listContent: { padding: 12, paddingBottom: 8 },
  messageContainer: { marginBottom: 8, maxWidth: '80%' },
  own: { alignSelf: 'flex-end' },
  other: { alignSelf: 'flex-start' },
  messageBubble: { padding: 12, borderRadius: 16, position: 'relative' },
  ownText: { color: '#0f1115' },
  otherText: { color: '#fff' },
  messageText: { fontSize: 16 },
  time: { fontSize: 10, color: '#666', marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { backgroundColor: '#1e1e1e', padding: 8, borderTopWidth: 1, borderTopColor: '#333' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: '#0f1115', color: '#fff', padding: 12, borderRadius: 24, fontSize: 16, marginRight: 8 },
  sendButton: { backgroundColor: '#7dd3fc', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: '#0f1115', fontSize: 20, fontWeight: 'bold' },
  image: { width: 200, height: 200, borderRadius: 12, marginTop: 8 },
  attachmentPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e1e', padding: 8, borderRadius: 8, margin: 8 },
  attachmentPreviewText: { color: '#fff', fontSize: 14, flex: 1 },
  attachmentRemove: { padding: 4 },
  attachmentButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d2d2d' },
  attachmentButtonText: { fontSize: 20 },
})