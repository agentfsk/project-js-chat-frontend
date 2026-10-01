import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@shared/store/auth'
import { createAuthApi } from '@shared/api'
import { BACKEND_URL } from '../config'

export function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const authApi = createAuthApi(async (path, options) => {
    const res = await fetch(`${BACKEND_URL}${path}`, options)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Ошибка ${res.status}`)
    }
    return res.json()
  })

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Ошибка', 'Введите ник и пароль')
      return
    }
    setLoading(true)
    try {
      const { token, username: userName } = await authApi.login(username, password)
      await setSession(token, userName)
      // RootNavigator will automatically switch to MainTabs when token is set
    } catch (err: any) {
      Alert.alert('Ошибка входа', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messenger</Text>
      <TextInput
        style={styles.input}
        placeholder="Никнейм"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Войти</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { /* navigation handled by root */ }}>
        <Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f1115' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#7dd3fc', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#0f1115', fontSize: 16, fontWeight: '600' },
  link: { color: '#7dd3fc', textAlign: 'center', marginTop: 16, fontSize: 16 },
})