import { useEffect } from 'react'
import { useCallStore } from '../store/calls'
import * as callManager from '../callManager'
import Avatar from './Avatar'

function IncomingCallOverlay() {
  const peer = useCallStore((state) => state.peer)
  const mode = useCallStore((state) => state.mode)
  const phase = useCallStore((state) => state.phase)
  const direction = useCallStore((state) => state.direction)

  useEffect(() => {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const gain = ctx.createGain()
    gain.gain.value = 0.08
    gain.connect(ctx.destination)

    let step = 0
    const timer = window.setInterval(() => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = step % 2 === 0 ? 440 : 554
      osc.connect(gain)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
      step += 1
    }, 500)

    return () => {
      window.clearInterval(timer)
      void ctx.close()
    }
  }, [])

  if (phase !== 'ringing' || direction !== 'incoming') return null
  if (!peer) return null

  const isVideo = mode === 'video'

  return (
    <div className="call-overlay incoming-call" role="alertdialog" aria-modal="true">
      <div className="call-card">
        <Avatar username={peer.username} src={peer.avatarUrl} size={96} />
        <div className="call-peer-name">{peer.username}</div>
        <div className="call-status-text">
          {isVideo ? 'Входящий видеозвонок…' : 'Входящий звонок…'}
        </div>
        <div className="call-actions">
          <button
            type="button"
            className="call-action danger-btn"
            onClick={() => callManager.decline()}
          >
            Отклонить
          </button>
          <button
            type="button"
            className="call-action"
            onClick={() => {
              void callManager.accept()
            }}
          >
            Ответить
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallOverlay