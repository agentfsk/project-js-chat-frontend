import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Easing, Platform, Alert, KeyboardAvoidingView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RTCView } from 'react-native-webrtc'
import { useGroupCallStore } from '@messenger/shared/src/groupCall/groupCallStore'
import { getGroupCallEngineManager } from '@messenger/shared/src/groupCall/GroupCallEngineManager'
import { ParticipantTile } from './ParticipantTile'
import { GroupCallParticipantListModal } from './GroupCallParticipantListModal'
import { useNavigation, useRoute } from '@react-navigation/native'

interface GroupCallScreenRouteParams {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  isCreator: boolean
  displayName: string
  avatarUrl: string | null
  rtpCapabilities: any
  iceServers: any[]
}

export const GroupCallScreen: React.FC = () => {
  const navigation = useNavigation()
  const route = useRoute<{ params: GroupCallScreenRouteParams }>()
  const { callId, channelId, mode, isCreator, displayName, avatarUrl, rtpCapabilities, iceServers } = route.params

  const engineManager = getGroupCallEngineManager()
  const { state, participants, localParticipant, phase } = useGroupCallStore()
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid')
  const [showParticipants, setShowParticipants] = useState(false)
  const [speakerId, setSpeakerId] = useState<string | null>(null)
  const [speakerScale, setSpeakerScale] = useState(1)
  const panGesture = useRef(new Animated.Value(0)).current

  const participantArray = Array.from(participants.values())
  const activeSpeaker = participantArray.find(p => p.isSpeaking && !p.isMuted)
  const localUserId = state?.creatorId

  useEffect(() => {
    const joinCall = async () => {
      try {
        await engineManager.joinGroupCall({
          callId,
          channelId,
          mode,
          userId: localUserId!,
          displayName,
          avatarUrl,
          isCreator,
          rtpCapabilities,
          iceServers,
          device: null,
          events: {
            onStateChange: (newState) => {},
            onParticipantJoined: (p) => setSpeakerId(p.userId),
            onParticipantLeft: (userId) => { if (speakerId === userId) setSpeakerId(null) },
            onParticipantUpdated: (p) => { if (p.isSpeaking) setSpeakerId(p.userId) },
            onLocalMediaStarted: (stream) => {},
            onLocalMediaStopped: (kind) => {},
            onRemoteTrackReceived: (participantId, track, kind) => {},
            onRemoteTrackRemoved: (participantId, kind) => {},
            onError: (error) => Alert.alert('Ошибка', error.message),
            onConnectionStateChange: (state) => {},
          },
        })
      } catch (error) {
        Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось присоединиться к звонку')
        navigation.goBack()
      }
    }
    joinCall()

    return () => {
      engineManager.leaveGroupCall()
    }
  }, [callId, channelId, mode, isCreator, displayName, avatarUrl, rtpCapabilities, iceServers, localUserId, navigation, engineManager])

  useEffect(() => {
    if (activeSpeaker && viewMode === 'speaker') {
      setSpeakerId(activeSpeaker.userId)
    }
  }, [activeSpeaker, viewMode])

  const handlePinch = useCallback((e: any) => {
    if (viewMode === 'speaker') {
      const scale = Math.max(1, Math.min(3, e.scale))
      setSpeakerScale(scale)
    }
  }, [viewMode])

  const toggleMic = async () => {
    await engineManager.toggleMic()
  }

  const toggleCam = async () => {
    await engineManager.toggleCam()
  }

  const toggleScreenShare = async () => {
    await engineManager.toggleScreenShare()
  }

  const leaveCall = async () => {
    await engineManager.leaveGroupCall()
    navigation.goBack()
  }

  const renderParticipant = useCallback(({ item }: { item: GroupCallParticipant }) => {
    const isLocal = item.userId === localUserId
    return (
      <ParticipantTile
        key={item.userId}
        participant={item}
        isLocal={isLocal}
        layout={viewMode}
        speakerScale={viewMode === 'speaker' && item.userId === speakerId ? speakerScale : 1}
        onPress={() => {
          if (viewMode === 'grid') setSpeakerId(item.userId)
        }}
      />
    )
  }, [localUserId, viewMode, speakerId, speakerScale])

  const numColumns = viewMode === 'grid' ? 2 : 1

  if (phase === 'connecting') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Подключение к звонку...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {viewMode === 'grid' ? (
        <FlatList
          data={participantArray}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.userId}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Animated.View style={[styles.speakerContainer, { transform: [{ scale: speakerScale }] }]}>
          {speakerId && participantArray.find(p => p.userId === speakerId) && (
            <ParticipantTile
              participant={participantArray.find(p => p.userId === speakerId)!}
              isLocal={speakerId === localUserId}
              layout="speaker"
              speakerScale={speakerScale}
            />
          )}
        </Animated.View>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleMic} activeOpacity={0.7}>
            <Ionicons name="mic" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCam} activeOpacity={0.7}>
            <Ionicons name="videocam" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={toggleScreenShare} activeOpacity={0.7}>
            <Ionicons name="desktop" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={leaveCall} activeOpacity={0.7}>
            <Ionicons name="call" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => setShowParticipants(true)} activeOpacity={0.7}>
            <Ionicons name="people" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'grid' && styles.modeButtonActive]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeButtonText, viewMode === 'grid' && styles.modeButtonTextActive]}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'speaker' && styles.modeButtonActive]}
            onPress={() => setViewMode('speaker')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeButtonText, viewMode === 'speaker' && styles.modeButtonTextActive]}>Speaker</Text>
          </TouchableOpacity>
        </View>
      </View>

      <GroupCallParticipantListModal
        visible={showParticipants}
        onClose={() => setShowParticipants(false)}
        participants={participantArray}
        localUserId={localUserId}
        isCreator={isCreator}
        engineManager={engineManager}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1115',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  gridContainer: {
    padding: 8,
    flexGrow: 1,
  },
  speakerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'rgba(15, 17, 21, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2d35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#E53E3E',
  },
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modeButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2d35',
  },
  modeButtonActive: {
    backgroundColor: '#00D4AA',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#0f1115',
  },
})