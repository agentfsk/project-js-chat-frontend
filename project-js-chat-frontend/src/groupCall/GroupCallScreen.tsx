import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGroupCallStore } from '../store/groupCall'
import { ParticipantTile } from './ParticipantTile'
import { GroupCallParticipantsSidebar } from './GroupCallParticipantsSidebar'
import { createMeshGroupCallEngine, type MeshGroupCallEngine, type MeshSignal } from './MeshGroupCallEngine'
import type { GroupCallMode, GroupCallParticipant } from './types'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useUsersStore } from '../store/users'
import { emitGroupCallJoin, emitGroupCallKick, emitGroupCallLeave, emitGroupCallPeerUpdate, emitGroupCallSignal } from '../socket'
import type { GroupCallKickedPayload, GroupCallSignalPayload } from '../types'
import { loadGroupCallState, saveGroupCallState } from './persistence'
import { apiRequest } from '../api/client'

type CallInfo = {
  callId: string
  channelId: number
  mode: GroupCallMode
  creatorId: number
}

export const GroupCallScreen: React.FC = () => {
  const navigate = useNavigate()
  const params = useParams<{ callId: string }>()
  const callId = params.callId!
  const token = useAuthStore((state) => state.token)
  const me = useUsersStore((state) => state.me)

  const { state, reset, initialize, updateParticipant } = useGroupCallStore()

  const engineRef = useRef<MeshGroupCallEngine | null>(null)
  const localStreamRef = useRef<MediaStream>(new MediaStream())
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid')
  const [showParticipants, setShowParticipants] = useState(false)
  const [speakerId, setSpeakerId] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(true)

  const localUserId = me ? String(me.id) : ''
  const isCreator = state?.creatorId === localUserId

  const participants = useMemo(() => state ? Array.from(state.participants.values()) : [], [state])
  const phase = state?.phase || 'idle'
  const canShareScreen = typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getDisplayMedia)

  const activeSpeaker = participants.find(p => p.isSpeaking && !p.isMuted)

  useEffect(() => {
    if (activeSpeaker && viewMode === 'speaker') {
      setSpeakerId(activeSpeaker.userId)
    }
  }, [activeSpeaker, viewMode])

  const leaveCall = useCallback((navigateBack = true) => {
    const userId = me ? String(me.id) : ''
    if (callId && userId) {
      emitGroupCallLeave({ callId, userId }).catch(() => undefined)
    }
    void engineRef.current?.leave()
    engineRef.current = null
    reset()
    setJoining(false)
    if (navigateBack) {
      navigate(callInfo ? `/channels/${callInfo.channelId}` : '/')
    }
  }, [callId, me, navigate, callInfo, reset])

  const applyLocalStream = useCallback(() => {
    setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
  }, [])

  const mergeLocalTracks = useCallback((stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      localStreamRef.current.getTracks()
        .filter((existing) => existing.kind === track.kind)
        .forEach((existing) => localStreamRef.current.removeTrack(existing))
      localStreamRef.current.addTrack(track)
    })
    applyLocalStream()
  }, [applyLocalStream])

  useEffect(() => {
    if (!callId || !token || !me) return
    let disposed = false

    const bootstrap = async () => {
      setJoining(true)
      setError(null)
      try {
        const info = await apiRequest<CallInfo>(`/api/v1/group-calls/${callId}`)
        if (disposed) return
        setCallInfo(info)

        const persisted = loadGroupCallState(callId)
        saveGroupCallState({
          callId: info.callId,
          channelId: info.channelId,
          mode: info.mode,
          groupId: persisted?.groupId,
          epoch: persisted?.epoch,
          localKeyId: persisted?.localKeyId,
          savedAt: new Date().toISOString(),
        })

        const joined = await emitGroupCallJoin({ callId, userId: String(me.id) })
        if (disposed) return

        const knownProfiles = useUsersStore.getState().profiles
        const localParticipant: GroupCallParticipant = {
          userId: String(me.id),
          displayName: me.username,
          avatarUrl: me.avatarUrl,
          role: info.creatorId === me.id ? 'creator' : 'participant',
          isMuted: false,
          isCameraOn: info.mode === 'video',
          isScreenSharing: false,
          isSpeaking: false,
          audioLevel: 0,
          joinedAt: new Date(),
        }
        const remoteParticipants: GroupCallParticipant[] = (joined.profiles ?? []).map((entry) => {
          const profile = entry.profile ?? knownProfiles[entry.userId]
          const updates = entry.updates ?? {}
          return {
            userId: String(entry.userId),
            displayName: profile?.username ?? '',
            avatarUrl: profile?.avatarUrl ?? null,
            role: 'participant',
            isMuted: Boolean(updates.isMuted),
            isCameraOn: Boolean(updates.isCameraOn),
            isScreenSharing: Boolean(updates.isScreenSharing),
            isSpeaking: false,
            audioLevel: 0,
            joinedAt: new Date(),
          }
        })

        initialize({
          callId: info.callId,
          channelId: info.channelId,
          mode: info.mode,
          phase: 'connecting',
          creatorId: String(info.creatorId),
          participants: [localParticipant, ...remoteParticipants],
          localParticipant,
          createdAt: new Date(),
          startedAt: null,
          endedAt: null,
          sframeKeys: new Map(),
          localKeyId: persisted?.localKeyId ?? 0,
        })

        const engine = createMeshGroupCallEngine()
        engineRef.current = engine

        await engine.start({
          callId,
          userId: String(me.id),
          mode: info.mode,
          existingPeerIds: remoteParticipants.map((participant) => participant.userId),
          sendSignal: (targetUserId, signal) => emitGroupCallSignal({
            callId,
            targetUserId,
            signal,
          }),
          onLocalStream: mergeLocalTracks,
          onLocalTrackStopped: (kind) => {
            localStreamRef.current.getTracks()
              .filter((track) => track.kind === kind)
              .forEach((track) => localStreamRef.current.removeTrack(track))
            applyLocalStream()
          },
          onRemoteTrack: (userId, track) => {
            setRemoteStreams(prev => {
              const newMap = new Map(prev)
              let stream = newMap.get(userId)
              if (!stream) {
                stream = new MediaStream()
                newMap.set(userId, stream)
              }
              stream.getTracks()
                .filter((existing) => existing.kind === track.kind)
                .forEach((existing) => stream!.removeTrack(existing))
              stream.addTrack(track)
              return newMap
            })
          },
          onRemoteTrackRemoved: (userId) => {
            setRemoteStreams(prev => {
              const newMap = new Map(prev)
              newMap.delete(userId)
              return newMap
            })
          },
          onError: (message) => {
            console.error('Group call peer error:', message)
          },
        })
        if (disposed) return

        const initialUpdates = {
          isMuted: engine.isMicMuted(),
          isCameraOn: engine.isCameraOn(),
          isScreenSharing: false,
        }
        updateParticipant(localUserId, initialUpdates)
        emitGroupCallPeerUpdate({
          callId,
          userId: localUserId,
          updates: initialUpdates,
        }).catch(() => undefined)

        useGroupCallStore.getState().setPhase('joined')
        setJoining(false)
      } catch (err) {
        if (disposed) return
        setJoining(false)
        setError(err instanceof Error ? err.message : 'Не удалось присоединиться к звонку')
      }
    }

    void bootstrap()

    return () => {
      disposed = true
      const userId = String(me.id)
      emitGroupCallLeave({ callId, userId }).catch(() => undefined)
      void engineRef.current?.leave()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, token, me?.id])

  useEffect(() => {
    const onSignal = (event: Event) => {
      const detail = (event as CustomEvent<GroupCallSignalPayload>).detail
      if (detail?.callId !== callId) return
      void engineRef.current?.handleSignal(detail.fromUserId, detail.signal as MeshSignal)
    }

    const onPeerLeft = (event: Event) => {
      const detail = (event as CustomEvent<{ callId: string; peerId: number }>).detail
      if (detail?.callId !== callId) return
      engineRef.current?.removePeer(String(detail.peerId))
    }

    const onKicked = (event: Event) => {
      const detail = (event as CustomEvent<GroupCallKickedPayload>).detail
      if (detail?.callId === callId) {
        leaveCall()
      }
    }

    const onEnded = (event: Event) => {
      const detail = (event as CustomEvent<{ callId: string }>).detail
      if (detail?.callId === callId) {
        leaveCall()
      }
    }

    window.addEventListener('group-call-signal', onSignal)
    window.addEventListener('group-call-peer-left', onPeerLeft)
    window.addEventListener('group-call-kicked', onKicked)
    window.addEventListener('group-call-ended', onEnded)

    return () => {
      window.removeEventListener('group-call-signal', onSignal)
      window.removeEventListener('group-call-peer-left', onPeerLeft)
      window.removeEventListener('group-call-kicked', onKicked)
      window.removeEventListener('group-call-ended', onEnded)
    }
  }, [callId, leaveCall])

  const publishUpdate = useCallback((updates: Partial<Pick<GroupCallParticipant, 'isMuted' | 'isCameraOn' | 'isScreenSharing'>>) => {
    if (!state || !me) return
    updateParticipant(localUserId, updates)
    emitGroupCallPeerUpdate({
      callId: state.callId,
      userId: localUserId,
      updates,
    }).catch(() => undefined)
  }, [state, me, localUserId, updateParticipant])

  const toggleMic = () => {
    const engine = engineRef.current
    if (!engine) return
    publishUpdate({ isMuted: engine.toggleMic() })
  }

  const toggleCam = async () => {
    const engine = engineRef.current
    if (!engine) return
    try {
      const cameraOn = await engine.toggleCam()
      publishUpdate({ isCameraOn: cameraOn })
    } catch (err) {
      console.error('Не удалось переключить камеру', err)
    }
  }

  const toggleScreenShare = async () => {
    const engine = engineRef.current
    if (!engine) return
    try {
      const sharing = await engine.toggleScreenShare()
      publishUpdate({ isScreenSharing: sharing })
    } catch (err) {
      console.error('Не удалось переключить демонстрацию экрана', err)
    }
  }

  const muteParticipant = (userId: string) => {
    if (!state) return
    const participant = state.participants.get(userId)
    if (!participant) return
    if (userId === localUserId) {
      toggleMic()
      return
    }
    const isMuted = !participant.isMuted
    updateParticipant(userId, { isMuted })
    emitGroupCallPeerUpdate({
      callId: state.callId,
      userId,
      updates: { isMuted },
    }).catch(() => undefined)
  }

  const kickParticipant = (userId: string) => {
    if (!state) return
    emitGroupCallKick(state.callId, userId).catch(() => undefined)
  }

  const renderParticipant = useCallback((participant: GroupCallParticipant) => {
    const isLocal = participant.userId === localUserId
    const videoStream = isLocal ? localStream : remoteStreams.get(participant.userId) ?? null

    return (
      <ParticipantTile
        key={participant.userId}
        participant={participant}
        isLocal={isLocal}
        layout={viewMode}
        viewMode={viewMode}
        speakerId={speakerId}
        speakerScale={viewMode === 'speaker' && participant.userId === speakerId ? 1 : 1}
        onClick={() => {
          if (viewMode === 'grid') setSpeakerId(participant.userId)
        }}
        stream={videoStream}
      />
    )
  }, [localUserId, viewMode, speakerId, localStream, remoteStreams])

  if (joining || phase === 'connecting' || phase === 'idle') {
    return (
      <div className="group-call-loading">
        <div className="loading-spinner"></div>
        <p>Подключение к звонку...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="group-call-error">
        <p>{error}</p>
        <button className="control-btn end-call" onClick={() => leaveCall()}>Выйти</button>
      </div>
    )
  }

  return (
    <div className="group-call-container">
      {viewMode === 'grid' ? (
        <div className="group-call-grid" role="list">
          {participants.map(participant => (
            <div key={participant.userId} className="grid-item" role="listitem">
              {renderParticipant(participant)}
            </div>
          ))}
        </div>
      ) : (
        <div className="group-call-speaker" role="region" aria-label="Speaker view">
          {(() => {
            const target = participants.find(p => p.userId === speakerId)
              ?? participants.find(p => p.isScreenSharing)
              ?? participants[0]
            return target ? renderParticipant(target) : null
          })()}
        </div>
      )}

      <div className="group-call-bottom-bar">
        <div className="group-call-controls">
          <button
            className={`control-btn ${state?.participants.get(localUserId)?.isMuted ? 'active' : ''}`}
            onClick={toggleMic}
            aria-label="Микрофон"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>
          <button
            className={`control-btn ${state?.participants.get(localUserId)?.isCameraOn ? '' : 'active'}`}
            onClick={toggleCam}
            aria-label="Камера"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
          <button
            className={`control-btn ${state?.participants.get(localUserId)?.isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            aria-label="Демонстрация экрана"
            title={canShareScreen ? 'Демонстрация экрана' : 'Браузер не поддерживает демонстрацию экрана'}
            disabled={!canShareScreen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          </button>
          <button className="control-btn end-call" onClick={() => leaveCall()} aria-label="Выйти из звонка">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15.05 5A5 5 0 0 1 19 8.95M15 3a2 2 0 0 1 2 2v4" />
              <path d="M8.95 19A5 5 0 0 0 5 15.05M5 21a2 2 0 0 1-2-2v-4" />
            </svg>
          </button>
          <button className="control-btn" onClick={() => setShowParticipants(true)} aria-label="Участники">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        </div>

        <div className="group-call-mode-toggle">
          <button
            className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Сетка"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Сетка</span>
          </button>
          <button
            className={`mode-btn ${viewMode === 'speaker' ? 'active' : ''}`}
            onClick={() => setViewMode('speaker')}
            aria-label="Докладчик"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Докладчик</span>
          </button>
        </div>
      </div>

      <GroupCallParticipantsSidebar
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        participants={participants}
        localUserId={localUserId}
        isCreator={isCreator}
        onMute={muteParticipant}
        onKick={kickParticipant}
      />
    </div>
  )
}
