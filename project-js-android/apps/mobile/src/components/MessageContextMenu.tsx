import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { REACTION_EMOJIS } from '@shared/data/emoji'

export type MessageMenuAction = {
  id: 'edit' | 'delete' | 'pin' | 'reply' | 'copy'
  label: string
  danger?: boolean
}

type MessageContextMenuProps = {
  x: number
  y: number
  actions: MessageMenuAction[]
  activeReactions: string[]
  onReact: (emoji: string) => void
  onSelect: (action: MessageMenuAction) => void
  onClose: () => void
}

const MENU_ITEM_HEIGHT = 48
const REACTION_BLOCK_HEIGHT = 56

function MessageContextMenu({
  x,
  y,
  actions,
  activeReactions,
  onReact,
  onSelect,
  onClose,
}: MessageContextMenuProps) {
  const menuRef = useRef<View>(null)

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === 'Escape') onClose()
    }

    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleActionPress = (action: MessageMenuAction) => {
    onSelect(action)
    onClose()
  }

  const handleReactPress = (emoji: string) => {
    onReact(emoji)
    onClose()
  }

  return (
    <View
      ref={menuRef}
      style={[
        styles.wrap,
        {
          left: Math.min(x, 300),
          top: Math.max(8, Math.min(y, 600 - actions.length * MENU_ITEM_HEIGHT - REACTION_BLOCK_HEIGHT)),
        },
      ]}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <View style={styles.reactions} data-reaction-strip>
        {REACTION_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[styles.reaction, activeReactions.includes(emoji) && styles.reactionActive]}
            onPress={() => handleReactPress(emoji)}
          >
            <Text style={styles.reactionText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.menu}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.menuItem, action.danger && styles.menuItemDanger]}
            onPress={() => handleActionPress(action)}
          >
            <Text style={[styles.menuItemText, action.danger && styles.menuItemTextDanger]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 1000,
  },
  reactions: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 4,
  },
  reaction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
  },
  reactionActive: {
    backgroundColor: '#7dd3fc',
  },
  reactionText: {
    fontSize: 20,
  },
  menu: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemDanger: {
    borderBottomColor: '#ef4444',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
  },
  menuItemTextDanger: {
    color: '#ef4444',
  },
})

export default MessageContextMenu