import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, Image } from 'react-native'
import { useNavigation, useRoute, type RouteProp, type NavigationProp } from '@react-navigation/native'
import { useUsersStore } from '@shared/store/users'
import { createUsersApi } from '@shared/api'
import { BACKEND_URL } from '../config'

type ContactsRouteParams = {
  Profile: { user: any }
  Chat: { channelId: number }
}

export function ContactsScreen() {
  const navigation = useNavigation<NavigationProp<ContactsRouteParams>>()
  const { contacts, requests, outgoingRequests, setInitialData: setUsersInitialData, addContact, removeContact } = useUsersStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const token = require('@shared/store/auth').useAuthStore.getState().token

  const usersApi = createUsersApi(async (path, options) => {
    const res = await fetch(`${BACKEND_URL}${path}`, options)
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    return res.json()
  })

  useEffect(() => {
    if (!token) return
    // Data is loaded in ChatListScreen, but we can refresh here if needed
  }, [token])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await usersApi.searchUsers(searchQuery)
      setSearchResults(results)
    } catch (err: any) {
      Alert.alert('Ошибка', err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleAddContact = async (userId: number) => {
    try {
      const result = await usersApi.sendContactRequest(userId)
      Alert.alert('Готово', result.status === 'accepted' ? 'Контакт добавлен' : 'Запрос отправлен')
      setSearchQuery('')
      setSearchResults([])
    } catch (err: any) {
      Alert.alert('Ошибка', err.message)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск пользователей..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={searching}>
          {searching ? <ActivityIndicator color="#0f1115" /> : <Text style={styles.searchButtonText}>Найти</Text>}
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Результаты поиска</Text>
          <FlatList
            data={searchResults}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactRow} onPress={() => navigation.navigate('Profile', { user: item } as any)}>
                <View style={styles.avatar}>
                  {item.avatarUrl ? <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{item.username[0]}</Text>}
                </View>
                <Text style={styles.contactName}>{item.username}</Text>
                {!contacts.find(c => c.id === item.id) && !outgoingRequests.find(r => r.to.id === item.id) && (
                  <TouchableOpacity style={styles.addButton} onPress={() => handleAddContact(item.id)}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => String(item.id)}
          />
        </View>
      )}

      {contacts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Контакты ({contacts.length})</Text>
          <FlatList
            data={contacts}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactRow} onPress={() => navigation.navigate('Chat', { channelId: item.id } as any)}>
                <View style={styles.avatar}>
                  {item.avatarUrl ? <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{item.username[0]}</Text>}
                </View>
                <Text style={styles.contactName}>{item.username}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => String(item.id)}
          />
        </View>
      )}

      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Входящие запросы ({requests.length})</Text>
          <FlatList
            data={requests}
            renderItem={({ item }) => (
              <View style={styles.requestRow}>
                <View style={styles.avatar}>
                  {item.from.avatarUrl ? <Image source={{ uri: item.from.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{item.from.username[0]}</Text>}
                </View>
                <Text style={styles.contactName}>{item.from.username}</Text>
                <View style={styles.requestActions}>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => Alert.alert('Принять запрос?')}>
                    <Text style={styles.acceptButtonText}>Принять</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineButton} onPress={() => Alert.alert('Отклонить запрос?')}>
                    <Text style={styles.declineButtonText}>Отклонить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            keyExtractor={(item) => String(item.id)}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 16 },
  searchContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  searchInput: { flex: 1, backgroundColor: '#1e1e1e', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16 },
  searchButton: { backgroundColor: '#7dd3fc', paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center' },
  searchButtonText: { color: '#0f1115', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  requestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#0f1115' },
  contactName: { color: '#fff', fontSize: 16, flex: 1 },
  addButton: { backgroundColor: '#7dd3fc', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#0f1115', fontSize: 20, fontWeight: 'bold' },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptButton: { backgroundColor: '#22c55e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  acceptButtonText: { color: '#fff', fontWeight: '600' },
  declineButton: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  declineButtonText: { color: '#fff', fontWeight: '600' },
})