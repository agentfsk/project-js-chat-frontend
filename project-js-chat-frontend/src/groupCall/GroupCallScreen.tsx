import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGroupCallStore } from '../store/groupCall'
import { ParticipantTile } from './ParticipantTile'
import { GroupCallParticipantsSidebar } from './GroupCallParticipantsSidebar'
import { createGroupCallEngine, createGroupCallEngineConfig, type GroupCallEngine } from './GroupCallEngine'
import type { GroupCallParticipant } from './types'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useUsersStore } from '../store/users'
import { emitGroupCallJoin } from '../socket'

export const GroupCallScreen: React.FC = () => {
  const navigate = useNavigate()
  const params = useParams<{ callId: string }>()
  const callId = params.callId!
  const token = useAuthStore((state) => state.token)
  const me = useUsersStore((state) => state.me)

  const {
    state,
    reset,
    initialize,
  } = useGroupCallStore()

  const engineRef = useRef<GroupCallEngine | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid')
  const [showParticipants, setShowParticipants] = useState(false)
  const [speakerId, setSpeakerId] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const localUserId = me ? String(me.id) : ''
  const isCreator = state?.creatorId === localUserId

  const participants = useMemo(() => state ? Array.from(state.participants.values()) : [], [state])
  const phase = state?.phase || 'idle'

  const activeSpeaker = participants.find(p => p.isSpeaking && !p.isMuted)

  useEffect(() => {
    if (activeSpeaker && viewMode === 'speaker') {
      setSpeakerId(activeSpeaker.userId)
    }
  }, [activeSpeaker, viewMode])

  const joinCall = useCallback(async () => {
    if (!callId || !state || !token || !me) return
    
    setError(null)
    try {
      const config = createGroupCallEngineConfig({
        callId: state.callId,
        channelId: state.channelId,
        mode: state.mode,
        userId: String(me.id),
        displayName: me.username,
        avatarUrl: me.avatarUrl,
        isCreator: state.creatorId === String(me.id),
        rtpCapabilities: null,
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        userIdString: String(me.id),
      })

      const engine = createGroupCallEngine(config)
      engineRef.current = engine

      engine.onStateChange = (newState) => {
        initialize({
          callId: newState.callId,
          channelId: newState.channelId,
          mode: newState.mode,
          phase: newState.phase,
          creatorId: newState.creatorId,
          participants: Array.from(newState.participants.values()),
          localParticipant: newState.localParticipant,
          createdAt: newState.createdAt,
          startedAt: newState.startedAt,
          endedAt: newState.endedAt,
          sframeKeys: newState.sframeKeys,
          localKeyId: newState.localKeyId,
        })
      }

      engine.onLocalMediaStarted = (stream) => {
        setLocalStream(stream)
      }

      engine.onLocalMediaStopped = (kind: 'audio' | 'video' | 'screen') => {
        if (kind === 'video' || kind === 'screen') {
          setLocalStream(prev => {
            if (!prev) return null
            const newStream = new MediaStream()
            prev.getAudioTracks().forEach(t => newStream.addTrack(t))
            return newStream
          })
        }
      }

      engine.onRemoteTrackReceived = (userId, track, _kind: 'audio' | 'video' | 'screen') => {
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          let stream = newMap.get(userId)
          if (!stream) {
            stream = new MediaStream()
            newMap.set(userId, stream)
          }
          stream.addTrack(track)
          return newMap
        })
      }

      engine.onRemoteTrackRemoved = (userId, kind) => {
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          const stream = newMap.get(userId)
          if (stream) {
            stream.getTracks().forEach(t => { if (t.kind === kind) stream.removeTrack(t) })
            if (stream.getTracks().length === 0) {
              newMap.delete(userId)
            }
          }
          return newMap
        })
      }

      engine.onError = (err) => {
        setError(err.message)
      }

      engine.onConnectionStateChange = (connState) => {
        if (connState === 'failed' || connState === 'disconnected') {
          setError('Connection lost')
        }
      }

      await engine.join(config)
      
      await emitGroupCallJoin({
        callId: state.callId,
        userId: localUserId,
        rtpCapabilities: engine.getState?.() ?? {},
      }).catch(console.error)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group call')
    }
  }, [callId, state, token, me, isCreator, localUserId, initialize])

  useEffect(() => {
    if (phase === 'idle' || phase === 'connecting') {
      joinCall()
    }
    return () => {
      if (engineRef.current) {
        engineRef.current.leave()
        engineRef.current = null
      }
    }
  }, [joinCall, phase])

  const toggleMic = async () => {
    await engineRef.current?.toggleMic()
  }

  const toggleCam = async () => {
    await engineRef.current?.toggleCam()
  }

  const toggleScreenShare = async () => {
    await engineRef.current?.toggleScreenShare()
  }

  const leaveCall = () => {
    engineRef.current?.leave()
    reset()
    navigate('/channels/' + state?.channelId)
  }

  const getVideoStream = (userId: string) => {
    return remoteStreams.get(userId) ?? null
  }

  const renderParticipant = useCallback((participant: GroupCallParticipant) => {
    const isLocal = participant.userId === localUserId
    let videoStream: MediaStream | null = null
    
    if (isLocal) {
      videoStream = localStream
    } else {
      videoStream = getVideoStream(participant.userId)
    }

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

  if (phase === 'connecting' || phase === 'idle') {
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
        <button onClick={leaveCall}>Leave</button>
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
          {speakerId && participants.find(p => p.userId === speakerId) && (
            renderParticipant(participants.find(p => p.userId === speakerId)!)
          )}
        </div>
      )}

      <div className="group-call-bottom-bar">
        <div className="group-call-controls">
          <button className="control-btn" onClick={toggleMic} aria-label="Микрофон">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>
          <button className="control-btn" onClick={toggleCam} aria-label="Камера">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
          <button className="control-btn" onClick={toggleScreenShare} aria-label="Демонстрация экрана">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          </button>
          <button className="control-btn end-call" onClick={leaveCall} aria-label="Выйти из звонка">
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
      />
    </div>
  )
}