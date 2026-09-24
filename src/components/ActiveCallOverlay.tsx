import { useEffect, useState } from 'react'
import { useCallStore } from '../store/calls'
import * as callManager from '../callManager'
import Avatar from './Avatar'

const canShareScreen =
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia)

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function useVideoMuted(stream: MediaStream | null): boolean {
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    setMuted(false)
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return
    const update = () => setMuted(track.muted || !track.enabled)
    track.addEventListener('mute', update)
    track.addEventListener('unmute', update)
    track.addEventListener('ended', update)
    update()
    return () => {
      track.removeEventListener('mute', update)
      track.removeEventListener('unmute', update)
      track.removeEventListener('ended', update)
    }
  }, [stream])

  return muted
}

function useCallDuration(): number {
  const phase = useCallStore((state) => state.phase)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (phase !== 'active') {
      setSeconds(0)
      return
    }
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  return seconds
}

function videoStreamRef(stream: MediaStream | null): (node: HTMLVideoElement | null) => void {
  return (node) => {
    if (node && node.srcObject !== stream) {
      node.srcObject = stream
    }
  }
}

function ActiveCallOverlay() {
  const phase = useCallStore((state) => state.phase)
  const mode = useCallStore((state) => state.mode)
  const peer = useCallStore((state) => state.peer)
  const error = useCallStore((state) => state.error)
  const micOn = useCallStore((state) => state.micOn)
  const camOn = useCallStore((state) => state.camOn)
  const screenOn = useCallStore((state) => state.screenOn)
  const localStream = useCallStore((state) => state.localStream)
  const remoteStream = useCallStore((state) => state.remoteStream)
  const duration = useCallDuration()
  const remoteVideoMuted = useVideoMuted(remoteStream)

  if (phase === 'idle') return null

  if (phase === 'ended') {
    return (
      <div className="call-toast" role="status">
        {error ?? 'Звонок завершён'}
      </div>
    )
  }

  if (phase === 'calling') {
    return (
      <div className="call-overlay outgoing-call" role="dialog" aria-modal="true">
        <div className="call-card">
          <Avatar username={peer?.username ?? '?'} src={peer?.avatarUrl} size={96} />
          <div className="call-peer-name">{peer?.username ?? ''}</div>
          <div className="call-status-text">
            {mode === 'video' ? 'Видеозвонок…' : 'Звонок…'}
          </div>
          <div className="call-actions">
            <button
              type="button"
              className="call-action danger-btn"
              onClick={() => callManager.hangup('canceled')}
            >
              Отменить
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase !== 'active' || !peer) return null

  const localHasVideo = Boolean(localStream?.getVideoTracks().length)
  const showLocalVideo = localHasVideo && (camOn || screenOn)
  const remoteHasVideo = Boolean(remoteStream?.getVideoTracks().length)
  const showRemoteVideo = remoteHasVideo && !remoteVideoMuted

  return (
    <div className="call-overlay active-call" role="dialog" aria-modal="true">
      <div className="call-media">
        {showRemoteVideo ? (
          <video
            className="call-remote-video"
            autoPlay
            playsInline
            ref={videoStreamRef(remoteStream)}
          />
        ) : (
          <div className="call-remote-placeholder">
            <Avatar username={peer.username} src={peer.avatarUrl} size={112} />
            <div className="call-freeze-name">{peer.username}</div>
          </div>
        )}
        <div className="call-self-pip">
          {showLocalVideo ? (
            <video
              className="call-self-video"
              autoPlay
              playsInline
              muted
              ref={videoStreamRef(localStream)}
              style={screenOn ? undefined : { transform: 'scaleX(-1)' }}
            />
          ) : (
            <Avatar username={peer.username} src={peer.avatarUrl} size={40} />
          )}
        </div>
        <div className="call-status-text call-duration">{formatDuration(duration)}</div>
      </div>
      <div className="call-controls">
        <button
          type="button"
          className={`call-action ${micOn ? '' : 'danger-btn'}`}
          aria-label={micOn ? 'Выключить микрофон' : 'Включить микрофон'}
          title={micOn ? 'Выключить микрофон' : 'Включить микрофон'}
          onClick={() => void callManager.toggleMic()}
        >
          {micOn ? '🎙️' : '🔇'}
        </button>
        <button
          type="button"
          className={`call-action ${camOn ? '' : 'danger-btn'}`}
          aria-label={camOn ? 'Выключить камеру' : 'Включить камеру'}
          title={camOn ? 'Выключить камеру' : 'Включить камеру'}
          onClick={() => void callManager.toggleCam()}
        >
          {camOn ? '📹' : '🚫'}
        </button>
        {canShareScreen && (
          <button
            type="button"
            className={`call-action ${screenOn ? 'danger-btn' : ''}`}
            aria-label={screenOn ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
            title={screenOn ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
            onClick={() => {
              if (screenOn) {
                void callManager.stopShare()
              } else {
                void callManager.startShare()
              }
            }}
          >
            {screenOn ? '🖥️' : '🧑‍💻'}
          </button>
        )}
        <button
          type="button"
          className="call-action hangup-btn"
          aria-label="Завершить звонок"
          title="Завершить звонок"
          onClick={() => callManager.hangup()}
        >
          📵
        </button>
      </div>
    </div>
  )
}

export default ActiveCallOverlay