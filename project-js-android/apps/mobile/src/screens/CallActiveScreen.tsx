import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Modal } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { RTCView } from 'react-native-webrtc'
import { useCallStore } from '@shared/store/calls'
import { toggleMic, toggleCam, startShare, stopShare, hangup, onCallEnded } from '@shared/callManager'
import { SafetyNumberModal } from '../components/SafetyNumberModal'
import { BACKEND_URL } from '../config'

type CallActiveRouteParams = { callId: string; channelId: number; mode: 'audio' | 'video'; peer: any }
type CallActiveRouteProp = RouteProp<{ CallActive: CallActiveRouteParams }, 'CallActive'>

export function CallActiveScreen() {
  const navigation = useNavigation()
  const route = useRoute<CallActiveRouteProp>()
  const { callId, channelId, mode, peer } = route.params
  const { localStream, remoteStream, micOn, camOn, screenOn, remoteVideo, setError, phase, safetyNumber } = useCallStore()
  const [showSafetyNumber, setShowSafetyNumber] = useState(false)

  const localViewRef = useRef<any>(null)
  const remoteViewRef = useRef<any>(null)

  useEffect(() => {
    const unsub = useCallStore.subscribe((state) => {
      if (state.phase === 'ended') navigation.goBack()
    })
    return unsub
  }, [])

  const handleHangup = () => {
    hangup()
    navigation.goBack()
  }

  const handleToggleMic = async () => {
    try { await toggleMic() } catch (err: any) { setError(err.message) }
  }

  const handleToggleCam = async () => {
    try { await toggleCam() } catch (err: any) { setError(err.message) }
  }

  const handleToggleScreen = async () => {
    try {
      if (screenOn) await stopShare()
      else await startShare()
    } catch (err: any) { setError(err.message) }
  }

  if (!peer) return null

  return (
    <View style={styles.container}>
      <RTCView
        ref={remoteViewRef}
        style={styles.remoteVideo}
        streamURL={remoteStream?.toURL?.() || ''}
        mirror={false}
        objectFit="cover"
      />

      {localStream && (
        <RTCView
          ref={localViewRef}
          style={styles.localVideo}
          streamURL={localStream.toURL?.() || ''}
          mirror={true}
          objectFit="cover"
        />
      )}

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.peerName}>{peer.username}</Text>
          <Text style={styles.callStatus}>{remoteVideo ? 'Подключено' : 'Подключение...'}</Text>
        </View>
        <View style={styles.topBarRight}>
          {safetyNumber && (
            <TouchableOpacity style={styles.e2eeButton} onPress={() => setShowSafetyNumber(true)}>
              <Text style={styles.e2eeIcon}>🔒</Text>
              <Text style={styles.e2eeText}>E2EE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, micOn && styles.active]} onPress={handleToggleMic}>
          <Text style={styles.controlIcon}>{micOn ? '🎤' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, camOn && styles.active]} onPress={handleToggleCam}>
          <Text style={styles.controlIcon}>{camOn ? '📷' : '📷'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, screenOn && styles.active]} onPress={handleToggleScreen}>
          <Text style={styles.controlIcon}>{screenOn ? '📺' : '📺'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.hangup]} onPress={handleHangup}>
          <Text style={styles.controlIcon}>📞</Text>
        </TouchableOpacity>
      </View>

      <SafetyNumberModal visible={showSafetyNumber} onClose={() => setShowSafetyNumber(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  remoteVideo: { flex: 1 },
  localVideo: { position: 'absolute', top: 60, right: 16, width: 120, height: 160, borderRadius: 12, borderWidth: 2, borderColor: '#7dd3fc' },
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topBarLeft: { flex: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  peerName: { color: '#fff', fontSize: 20, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  callStatus: { color: '#7dd3fc', fontSize: 14, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  e2eeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(125, 211, 252, 0.2)', borderRadius: 12, borderWidth: 1, borderColor: '#7dd3fc' },
  e2eeIcon: { fontSize: 14 },
  e2eeText: { color: '#7dd3fc', fontSize: 12, fontWeight: '600' },
  controls: { position: 'absolute', bottom: 40, left: 16, right: 16, flexDirection: 'row', justifyContent: 'center', gap: 24 },
  controlButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333' },
  active: { backgroundColor: '#7dd3fc', borderColor: '#7dd3fc' },
  hangup: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  controlIcon: { fontSize: 24 },
})