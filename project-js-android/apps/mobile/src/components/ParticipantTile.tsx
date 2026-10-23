import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native'
import { RTCView } from 'react-native-webrtc'
import { useGroupCallStore } from '@messenger/shared/src/groupCall/groupCallStore'
import type { GroupCallParticipant } from '@messenger/shared/src/groupCall/types'

interface ParticipantTileProps {
  participant: GroupCallParticipant
  isLocal: boolean
  layout: 'grid' | 'speaker'
  onPress?: () => void
  speakerScale?: number
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal,
  layout,
  onPress,
  speakerScale = 1,
}) => {
  const { localVideoTrack, localScreenTrack, localAudioTrack } = useGroupCallStore()
  const speakingAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (participant.isSpeaking) {
      Animated.timing(speakingAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(speakingAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()
    }
  }, [participant.isSpeaking, speakingAnim])

  const hasVideo = layout === 'speaker' 
    ? (participant.isScreenSharing ? true : (isLocal ? !!(localVideoTrack || localScreenTrack) : true))
    : (participant.isScreenSharing || (isLocal ? !!(localVideoTrack || localScreenTrack) : true))

  const speakingStyle = {
    borderWidth: speakingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 3],
    }),
    borderColor: '#00D4AA',
  }

  const tileStyle = [
    styles.tile,
    layout === 'speaker' && styles.tileSpeaker,
    isLocal && styles.tileLocal,
    { transform: [{ scale: speakerScale }] },
  ]

  return (
    <TouchableOpacity
      style={tileStyle}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasVideo ? (
        <>
          <RTCView
            streamURL={participant.isScreenSharing ? 'screen' : 'video'}
            style={styles.video}
            objectFit="cover"
            zOrder={0}
          />
          <Animated.View style={[styles.speakingRing, speakingStyle]} />
        </>
      ) : (
        <View style={[styles.avatarContainer, styles.video]}>
          {participant.avatarUrl ? (
            <Image source={{ uri: participant.avatarUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>{participant.displayName[0]?.toUpperCase()}</Text>
          )}
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.infoRow}>
          <Text style={[styles.name, isLocal && styles.nameLocal]} numberOfLines={1}>
            {participant.displayName} {isLocal ? '(Вы)' : ''}
          </Text>
          {participant.isSpeaking && (
            <Animated.View style={[styles.speakingDot, { opacity: speakingAnim }]} />
          )}
        </View>

        <View style={styles.controlsRow}>
          {participant.isMuted && <Text style={styles.controlIcon}>🔇</Text>}
          {!participant.isCameraOn && !participant.isScreenSharing && (
            <Text style={styles.controlIcon}>📷</Text>
          )}
          {participant.isScreenSharing && <Text style={styles.controlIcon}>🖥</Text>}
          {participant.role === 'creator' && <Text style={styles.controlIcon}>👑</Text>}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#1a1d23',
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
    minWidth: 120,
    minHeight: 120,
  },
  tileSpeaker: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  tileLocal: {
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2d35',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  speakingRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    pointerEvents: 'none',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  nameLocal: {
    color: '#00D4AA',
  },
  speakingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4AA',
    marginLeft: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  controlIcon: {
    fontSize: 12,
  },
})