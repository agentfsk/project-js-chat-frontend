import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Vibration } from 'react-native'
import { useNavigation, useRoute, type RouteProp, type NavigationProp } from '@react-navigation/native'
import { Audio } from 'expo-av'
import { useCallStore } from '@shared/store/calls'
import { accept, decline, onCallEnded } from '@shared/callManager'
import { BACKEND_URL } from '../config'

type CallIncomingRouteParams = { callId: string; channelId: number; mode: 'audio' | 'video'; peer: any }
type CallIncomingRouteProp = RouteProp<{ CallIncoming: CallIncomingRouteParams }, 'CallIncoming'>
type RootStackParamList = { CallActive: { callId: string; channelId: number; mode: 'audio' | 'video'; peer: any } }

let sound: Audio.Sound | null = null

export function CallIncomingScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const route = useRoute<CallIncomingRouteProp>()
  const { peer, mode, callId, channelId } = route.params
  const { setError } = useCallStore.getState()

  useEffect(() => {
    // Play ringtone
    const playRingtone = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(require('../../assets/ringtone.mp3'), { isLooping: true, volume: 1.0 })
        sound = newSound
        await sound.playAsync()
      } catch (err) {
        console.warn('Failed to play ringtone', err)
      }
    }
    playRingtone()

    // Vibrate
    Vibration.vibrate([0, 1000, 2000], true)

    return () => {
      if (sound) {
        sound.stopAsync()
        sound.unloadAsync()
        sound = null
      }
      Vibration.cancel()
    }
  }, [])

  const handleAccept = async () => {
    try {
      await accept()
      navigation.navigate('CallActive', { callId, channelId, mode, peer })
    } catch (err: any) {
      setError(err.message)
      navigation.goBack()
    }
  }

  const handleDecline = () => {
    decline()
    navigation.goBack()
  }

  if (!peer) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.callType}>{mode === 'video' ? 'Видеозвонок' : 'Голосовой звонок'}</Text>
        <Text style={styles.callingText}>Входящий звонок</Text>
      </View>

      <View style={styles.avatarContainer}>
        {peer.avatarUrl ? (
          <Image source={{ uri: `${BACKEND_URL}${peer.avatarUrl}` }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{peer.username[0]}</Text></View>
        )}
        <Text style={styles.peerName}>{peer.username}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.declineButton} onPress={handleDecline} activeOpacity={0.8}>
          <View style={styles.buttonIcon}>✕</View>
          <Text style={styles.buttonLabel}>Отклонить</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.8}>
          <View style={styles.buttonIcon}>✓</View>
          <Text style={styles.buttonLabel}>Принять</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  callType: { color: '#7dd3fc', fontSize: 18, fontWeight: '600', textTransform: 'uppercase' },
  callingText: { color: '#888', fontSize: 14, marginTop: 4 },
  avatarContainer: { alignItems: 'center', marginBottom: 48 },
  avatar: { width: 140, height: 140, borderRadius: 70 },
  avatarPlaceholder: { backgroundColor: '#7dd3fc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 60, fontWeight: 'bold', color: '#0f1115' },
  peerName: { color: '#fff', fontSize: 28, fontWeight: '600', marginTop: 16 },
  buttonsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 40 },
  declineButton: { alignItems: 'center' },
  acceptButton: { alignItems: 'center' },
  buttonIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
})