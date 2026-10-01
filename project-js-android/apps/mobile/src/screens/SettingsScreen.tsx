import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native'
import { useAuthStore } from '@shared/store/auth'
import { useThemeStore } from '@shared/store/theme'

export function SettingsScreen() {
  const { token, username, clear } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', onPress: () => { clear(); } },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Профиль</Text>
        <View style={styles.profileRow}>
          <Text style={styles.label}>Никнейм</Text>
          <Text style={styles.value}>{username}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Настройки</Text>
        <View style={styles.settingRow}>
          <Text style={styles.label}>Тёмная тема</Text>
          <Switch
            value={theme === 'dark'}
            onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
            thumbColor={theme === 'dark' ? '#7dd3fc' : '#fff'}
            trackColor={{ false: '#333', true: '#7dd3fc' }}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.label}>Уведомления</Text>
          <Switch value={true} onValueChange={() => {}} thumbColor="#7dd3fc" trackColor={{ false: '#333', true: '#7dd3fc' }} />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
          <Text style={styles.dangerButtonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.version}>
        <Text style={styles.versionText}>Messenger v1.0.0</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  label: { color: '#fff', fontSize: 16 },
  value: { color: '#888', fontSize: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  dangerButton: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  dangerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  version: { alignItems: 'center', marginTop: 32, paddingBottom: 32 },
  versionText: { color: '#444', fontSize: 12 },
})