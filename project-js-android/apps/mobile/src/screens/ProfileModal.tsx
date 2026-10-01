import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native'
import { useNavigation, useRoute, type RouteProp, type NavigationProp } from '@react-navigation/native'
import { useUsersStore } from '@shared/store/users'
import { createUsersApi } from '@shared/api'
import { BACKEND_URL } from '../config'

type ProfileModalRouteParams = { user: any }
type ProfileModalRouteProp = RouteProp<{ Profile: ProfileModalRouteParams }, 'Profile'>
type RootStackParamList = { EditProfile: { user: any } }

export function ProfileModal() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const route = useRoute<ProfileModalRouteProp>()
  const { user } = route.params
  const { me, removeContact } = useUsersStore()

  const isOwn = user.id === me?.id

  const handleEdit = () => navigation.navigate('EditProfile', { user })

  const handleRemoveContact = () => {
    Alert.alert('Удалить контакт', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        try {
          const usersApi = createUsersApi(async (path, options) => {
            const res = await fetch(`${BACKEND_URL}${path}`, options)
            if (!res.ok) throw new Error(`Ошибка ${res.status}`)
            return res.json()
          })
          await usersApi.removeContact(user.id)
          Alert.alert('Готово', 'Контакт удалён')
          navigation.goBack()
        } catch (err: any) { Alert.alert('Ошибка', err.message) }
      }}
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerButton}>Закрыть</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль</Text>
        {isOwn && <TouchableOpacity onPress={handleEdit}><Text style={styles.headerButton}>Редактировать</Text></TouchableOpacity>}
      </View>

      <View style={styles.profile}>
        {user.avatarUrl ? <Image source={{ uri: `${BACKEND_URL}${user.avatarUrl}` }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{user.username[0]}</Text></View>}
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      {!isOwn && (
        <TouchableOpacity style={styles.dangerButton} onPress={handleRemoveContact}>
          <Text style={styles.dangerButtonText}>Удалить из контактов</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  headerButton: { color: '#7dd3fc', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  profile: { alignItems: 'center', padding: 32 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 50, fontWeight: 'bold', color: '#0f1115' },
  username: { color: '#fff', fontSize: 28, fontWeight: '600', marginTop: 16 },
  dangerButton: { margin: 16, backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center' },
  dangerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})