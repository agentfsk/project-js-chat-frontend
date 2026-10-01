import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList, Image } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useChatStore } from '@shared/store/chat'
import { useUsersStore } from '@shared/store/users'
import { emitCreateGroup } from '@shared/socket'

export function CreateGroupModal() {
  const navigation = useNavigation()
  const route = useRoute()
  const { contacts } = useUsersStore()
  const { addChannel } = useChatStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const toggleMember = (id: number) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Ошибка', 'Введите название группы'); return }
    setLoading(true)
    try {
      const channel = await emitCreateGroup({ name: name.trim(), description: description.trim(), memberIds: selectedMembers })
      addChannel(channel)
      navigation.goBack()
    } catch (err: any) { Alert.alert('Ошибка', err.message) }
    finally { setLoading(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerButton}>Отмена</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Новая группа</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}><Text style={[styles.headerButton, styles.createButton]}>{loading ? 'Создание...' : 'Создать'}</Text></TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Название группы" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Описание (необязательно)" value={description} onChangeText={setDescription} multiline />

      <Text style={styles.sectionTitle}>Участники ({selectedMembers.length})</Text>
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
  createButton: { fontWeight: '600' },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 16, borderRadius: 12, margin: 16, fontSize: 16 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: '600', marginHorizontal: 16, marginTop: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#0f1115' },
  contactName: { color: '#fff', fontSize: 16, flex: 1 },
  checkmark: { color: '#7dd3fc', fontSize: 20, fontWeight: 'bold' },
})