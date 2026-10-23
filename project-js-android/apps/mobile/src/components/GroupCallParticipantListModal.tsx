import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useGroupCallStore } from '@messenger/shared/src/groupCall/groupCallStore'
import { getGroupCallEngineManager } from '@messenger/shared/src/groupCall/GroupCallEngineManager'
import type { GroupCallParticipant } from '@messenger/shared/src/groupCall/types'

interface GroupCallParticipantListModalProps {
  visible: boolean
  onClose: () => void
  participants: GroupCallParticipant[]
  localUserId: string | undefined
  isCreator: boolean
  engineManager: ReturnType<typeof getGroupCallEngineManager>
}

export const GroupCallParticipantListModal: React.FC<GroupCallParticipantListModalProps> = ({
  visible,
  onClose,
  participants,
  localUserId,
  isCreator,
  engineManager,
}) => {
  const engine = engineManager.getEngine()

  const handleMuteParticipant = async (userId: string) => {
    if (!engine) return
    try {
      // This would send a mute request to the participant via signaling
      // For now, just show an alert
      Alert.alert('Заглушить участника', 'Функция в разработке')
    } catch (error) {
      console.error('Failed to mute participant:', error)
    }
  }

  const handleKickParticipant = async (userId: string) => {
    if (!engine) return
    Alert.alert(
      'Исключить участника',
      'Вы уверены, что хотите исключить этого участника?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Исключить', style: 'destructive', onPress: async () => {
          try {
            // This would send a kick request via signaling
            Alert.alert('Участник исключен')
          } catch (error) {
            console.error('Failed to kick participant:', error)
          }
        }},
      ]
    )
  }

  const renderParticipant = ({ item }: { item: GroupCallParticipant }) => {
    const isLocal = item.userId === localUserId
    const canManage = isCreator && !isLocal

    return (
      <View style={styles.participantRow}>
        <View style={styles.avatarContainer}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.displayName[0]?.toUpperCase()}</Text>
            </View>
          )}
          {item.isSpeaking && <View style={styles.speakingIndicator} />}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{item.displayName} {isLocal ? '(Вы)' : ''}</Text>
          <View style={styles.statusRow}>
            {item.isMuted && <Text style={styles.statusBadge}>🔇 Заглушен</Text>}
            {!item.isCameraOn && !item.isScreenSharing && <Text style={styles.statusBadge}>📷 Камера выкл</Text>}
            {item.isScreenSharing && <Text style={styles.statusBadgeScreen}>🖥 Демонстрация экрана</Text>}
          </View>
        </View>

        {canManage && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMuteParticipant(item.userId)}
            >
              <Ionicons name={item.isMuted ? 'volume-high' : 'volume-mute'} size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => handleKickParticipant(item.userId)}
            >
              <Ionicons name="person-remove" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
    )
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Участники ({participants.length})</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1d23',
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2d35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00D4AA',
    borderWidth: 2,
    borderColor: '#0f1115',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    fontSize: 12,
    color: '#aaa',
  },
  statusBadgeScreen: {
    fontSize: 12,
    color: '#00D4AA',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2d35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDanger: {
    backgroundColor: '#E53E3E',
  },
})