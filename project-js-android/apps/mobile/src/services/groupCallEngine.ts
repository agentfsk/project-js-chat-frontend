import { getGroupCallEngineManager } from '@messenger/shared/src/groupCall/GroupCallEngineManager'
import { foregroundCallService } from './foregroundCallService'
import type { GroupCallParticipant } from '@messenger/shared/src/groupCall/types'

interface JoinGroupCallParams {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  userId: string
  displayName: string
  avatarUrl: string | null
  isCreator: boolean
  rtpCapabilities: any
  iceServers: any[]
}

class GroupCallEngineMobile {
  private engineManager = getGroupCallEngineManager()

  async joinGroupCall(params: JoinGroupCallParams): Promise<void> {
    await this.engineManager.joinGroupCall({
      ...params,
      device: null,
      events: {
        onStateChange: (state) => {},
        onParticipantJoined: (participant) => {
          this.updateForegroundNotification(state)
        },
        onParticipantLeft: (userId) => {
          this.updateForegroundNotification(state)
        },
        onParticipantUpdated: (participant) => {
          this.updateForegroundNotification(state)
        },
        onLocalMediaStarted: (stream) => {},
        onLocalMediaStopped: (kind) => {},
        onRemoteTrackReceived: (participantId, track, kind) => {},
        onRemoteTrackRemoved: (participantId, kind) => {},
        onError: (error) => {
          console.error('Group call error:', error)
        },
        onConnectionStateChange: (state) => {},
      },
    })

    const state = this.engineManager.getState()
    if (state) {
      await this.startForegroundService(state)
    }
  }

  private async startForegroundService(state: any): Promise<void> {
    const participants = Array.from(state.participants.values())
    const participantNames = participants.map((p: GroupCallParticipant) => p.displayName)
    
    await foregroundCallService.start({
      callId: state.callId,
      channelId: state.channelId,
      participantCount: participants.length,
      participantNames,
    })
  }

  private async updateForegroundNotification(state: any): Promise<void> {
    const participants = Array.from(state.participants.values())
    const participantNames = participants.map((p: GroupCallParticipant) => p.displayName)
    
    await foregroundCallService.update({
      callId: state.callId,
      channelId: state.channelId,
      participantCount: participants.length,
      participantNames,
    })
  }

  async leaveGroupCall(): Promise<void> {
    await foregroundCallService.stop()
    await this.engineManager.leaveGroupCall()
  }

  async toggleMic(): Promise<void> {
    await this.engineManager.toggleMic()
  }

  async toggleCam(): Promise<void> {
    await this.engineManager.toggleCam()
  }

  async startScreenShare(): Promise<void> {
    await this.engineManager.startScreenShare()
  }

  async stopScreenShare(): Promise<void> {
    await this.engineManager.stopScreenShare()
  }

  async toggleScreenShare(): Promise<void> {
    await this.engineManager.toggleScreenShare()
  }

  getState() {
    return this.engineManager.getState()
  }

  isJoined(): boolean {
    return this.engineManager.isJoined()
  }

  getConnectionState() {
    return this.engineManager.getConnectionState()
  }
}

export const groupCallEngineMobile = new GroupCallEngineMobile()