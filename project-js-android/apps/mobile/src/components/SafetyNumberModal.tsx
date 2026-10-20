import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Image } from 'react-native'
import { getSafetyNumberFormatted, generateQRCodeSVG } from '@messenger/shared/crypto/safetyNumber'
import { useCallStore } from '@shared/store/calls'

interface SafetyNumberModalProps {
  visible: boolean
  onClose: () => void
}

export function SafetyNumberModal({ visible, onClose }: SafetyNumberModalProps) {
  const { safetyNumber, peer } = useCallStore.getState()

  if (!visible || !safetyNumber) return null

  const formatted = getSafetyNumberFormatted(safetyNumber)
  const qrData = `messenger://verify?fp=${safetyNumber.toString(16).padStart(15, '0')}&user=${peer?.username || ''}`
  const qrSvg = generateQRCodeSVG(qrData, 200)

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay} onTouchStart={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Safety Number</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.peerInfo}>
            <Text style={styles.peerLabel}>Verifying with</Text>
            <Text style={styles.peerName}>{peer?.username || 'Unknown'}</Text>
          </View>

          <View style={styles.qrContainer}>
            <Image
              source={{ uri: `data:image/svg+xml;base64,${btoa(qrSvg)}` }}
              style={styles.qrCode}
            />
          </View>

          <View style={styles.numberContainer}>
            <Text style={styles.numberLabel}>Safety Number</Text>
            <Text style={styles.numberValue}>{formatted}</Text>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Compare this number with your contact. If they match, your call is end-to-end encrypted.
            </Text>
          </View>

          <TouchableOpacity style={styles.verifyButton} onPress={() => Alert.alert('Verified', 'Contact marked as verified')}>
            <Text style={styles.verifyButtonText}>Mark as Verified</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: '#888',
    fontSize: 18,
  },
  peerInfo: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  peerLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  peerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  numberContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#0f0f1a',
    borderRadius: 8,
  },
  numberLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  numberValue: {
    color: '#7dd3fc',
    fontSize: 24,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  instructions: {
    marginBottom: 20,
  },
  instructionText: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: '#7dd3fc',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#0f1115',
    fontSize: 16,
    fontWeight: '600',
  },
})