import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useUsersStore } from '@shared/store/users'
import { emitInviteToGroup } from '@shared/socket'

export function InviteMembersModal() {
  const navigation = useNavigation()
  const route = useRoute()
  const { channel } = route.params as any
  const { contacts } = useUsersStore()
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])

  const toggleMember = (id: number) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleInvite = async () => {
    if (selectedMembers.length === 0) { Alert.alert('Ошибка', 'Выберите участников'); return }
    try {
      await emitInviteToGroup(channel.id, selectedMembers)
      Alert.alert('Готово', 'Приглашения отправлены')
      navigation.goBack()
    } catch (err: any) { Alert.alert('Ошибка', err.message) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerButton}>Отмена</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Пригласить в группу</Text>
        <TouchableOpacity onPress={handleInvite}><Text style={[styles.headerButton, styles.inviteButton]}>Пригласить ({selectedMembers.length})</Text></TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.contactRow} onPress={() => toggleMember(item.id)}>
            <View style={styles.avatar}>{item.avatarUrl ? <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{item.username[0]}</Text>}</View>
            <Text style={styles.contactName}>{item.username}</Text>
            {selectedMembers.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        )}
        keyExtractor={(item) => String(item.id)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  headerButton: { color: '#7dd3fc', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  inviteButton: { fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#0f1115' },
  contactName: { color: '#fff', fontSize: 16, flex: 1 },
  checkmark: { color: '#7dd3fc', fontSize: 20, fontWeight: 'bold' },
})