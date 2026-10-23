import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, FlatList } from 'react-native'
import { useNavigation, useRoute, type RouteProp, type NavigationProp } from '@react-navigation/native'
import { useChatStore } from '@shared/store/chat'
import { emitRemoveGroup, emitEditGroup, emitInviteToGroup, emitKickFromGroup, emitGroupCallCreate } from '@shared/socket'
import { Ionicons } from '@expo/vector-icons'

type GroupInfoRouteParams = { channel: any }
type GroupInfoRouteProp = RouteProp<{ GroupInfo: GroupInfoRouteParams }, 'GroupInfo'>
type RootStackParamList = { 
  EditGroup: { channel: any }
  InviteMembers: { channel: any }
}

export function GroupInfoModal() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const route = useRoute<GroupInfoRouteProp>()
  const { channel } = route.params
  const { updateChannel, removeChannel } = useChatStore()
  const { useAuthStore } = require('@shared/store/auth')
  const token = useAuthStore.getState().token
  const isOwner = channel?.ownerId === token

  const handleDelete = () => {
    Alert.alert('Удалить группу', 'Это действие нельзя отменить. Все сообщения будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        try { await emitRemoveGroup(channel.id); removeChannel(channel.id); navigation.goBack() }
        catch (err: any) { Alert.alert('Ошибка', err.message) }
      }}
    ])
  }

  const handleEdit = () => navigation.navigate('EditGroup', { channel })

  const handleInvite = () => navigation.navigate('InviteMembers', { channel })

  const handleKick = (userId: number) => {
    Alert.alert('Исключить участника', 'Участник потеряет доступ к группе.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Исключить', style: 'destructive', onPress: async () => {
        try { await emitKickFromGroup(channel.id, userId); Alert.alert('Готово', 'Участник исключен') }
        catch (err: any) { Alert.alert('Ошибка', err.message) }
      }}
    ])
  }

  const startGroupCall = async (mode: 'audio' | 'video') => {
    try {
      await emitGroupCallCreate({
        callId: `call-${channel.id}-${Date.now()}`,
        channelId: channel.id,
        mode,
      })
      Alert.alert('Групповой звонок запущен', `Приглашения отправлены участникам`)
      // Navigate to group call screen would happen here
    } catch (err: any) {
      Alert.alert('Ошибка', err.message)
    }
  }

  if (!channel) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerButton}>Закрыть</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Информация о группе</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.info}>
        {channel.avatarUrl ? <Image source={{ uri: channel.avatarUrl }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{channel.name[0]}</Text></View>}
        <Text style={styles.groupName}>{channel.name}</Text>
        {channel.description && <Text style={styles.description}>{channel.description}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Участники ({channel.members?.length || 0})</Text>
        <FlatList
          data={channel.members || []}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View style={styles.avatar}>{item.avatarUrl ? <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{item.username[0]}</Text>}</View>
              <Text style={styles.memberName}>{item.username}</Text>
              {item.id === channel.ownerId && <Text style={styles.badge}>Владелец</Text>}
              {channel.admins?.includes(item.id) && <Text style={[styles.badge, styles.adminBadge]}>Админ</Text>}
              {isOwner && item.id !== channel.ownerId && (
                <TouchableOpacity onPress={() => handleKick(item.id)} style={styles.kickButton}><Text style={styles.kickButtonText}>Исключить</Text></TouchableOpacity>
              )}
            </View>
          )}
          keyExtractor={(item) => String(item.id)}
        />
      </View>

      {isOwner && (
        <View style={styles.ownerActions}>
          <View style={styles.callSection}>
            <Text style={styles.callSectionTitle}>Групповой звонок</Text>
            <View style={styles.callButtons}>
              <TouchableOpacity style={styles.callButton} onPress={() => startGroupCall('audio')}>
                <Ionicons name="mic" size={24} color="#fff" />
                <Text style={styles.callButtonText}>Голосовой чат</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.callButton} onPress={() => startGroupCall('video')}>
                <Ionicons name="videocam" size={24} color="#fff" />
                <Text style={styles.callButtonText}>Видео чат</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleInvite}><Text style={styles.actionButtonText}>Пригласить друзей</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}><Text style={styles.actionButtonText}>Изменить группу</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleDelete}><Text style={styles.actionButtonText}>Удалить группу</Text></TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  headerButton: { color: '#7dd3fc', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  info: { alignItems: 'center', padding: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#0f1115' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  groupName: { color: '#fff', fontSize: 24, fontWeight: '600', marginTop: 16 },
  description: { color: '#888', fontSize: 14, marginTop: 8, textAlign: 'center' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  memberName: { color: '#fff', fontSize: 16, marginLeft: 12, flex: 1 },
  badge: { backgroundColor: '#7dd3fc', color: '#0f1115', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: '600' },
  adminBadge: { backgroundColor: '#f59e0b' },
  kickButton: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  kickButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  ownerActions: { padding: 16, gap: 12 },
  actionButton: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dangerButton: { borderColor: '#ef4444' },
  callSection: { marginTop: 8 },
  callSectionTitle: { color: '#888', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  callButtons: { flexDirection: 'row', gap: 12 },
  callButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  callButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})