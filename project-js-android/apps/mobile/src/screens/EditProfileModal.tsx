import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useAuthStore } from '@shared/store/auth'
import { createUsersApi } from '@shared/api'
import { BACKEND_URL } from '../config'

export function EditProfileModal() {
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = route.params as any
  const { setUsername } = useAuthStore()
  const [username, setUsernameState] = useState(user.username)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)
  const [loading, setLoading] = useState(false)

  const usersApi = createUsersApi(async (path, options) => {
    const res = await fetch(`${BACKEND_URL}${path}`, options)
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    return res.json()
  })

  const handleSave = async () => {
    if (!username.trim()) { Alert.alert('Ошибка', 'Введите никнейм'); return }
    setLoading(true)
    try {
      const updated = await usersApi.updateProfile({ username: username.trim(), avatarUrl })
      if (user.id === require('@shared/store/auth').useAuthStore.getState().username) {
        await setUsername(updated.username)
      }
      Alert.alert('Готово', 'Профиль обновлён')
      navigation.goBack()
    } catch (err: any) { Alert.alert('Ошибка', err.message) }
    finally { setLoading(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerButton}>Отмена</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Редактировать профиль</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}><Text style={[styles.headerButton, styles.saveButton]}>{loading ? 'Сохранение...' : 'Сохранить'}</Text></TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        {avatarUrl ? <Image source={{ uri: `${BACKEND_URL}${avatarUrl}` }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{username[0]}</Text></View>}
        <TouchableOpacity style={styles.avatarButton} onPress={() => Alert.alert('Выбор аватара', 'Функция в разработке')}>
          <Text style={styles.avatarButtonText}>✎</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Никнейм" value={username} onChangeText={setUsernameState} autoCapitalize="none" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  headerButton: { color: '#7dd3fc', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  saveButton: { fontWeight: '600' },
  avatarSection: { alignItems: 'center', padding: 24, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#0f1115' },
  avatarButton: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center' },
  avatarButtonText: { color: '#0f1115', fontSize: 16 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 16, borderRadius: 12, margin: 16, fontSize: 16 },
})