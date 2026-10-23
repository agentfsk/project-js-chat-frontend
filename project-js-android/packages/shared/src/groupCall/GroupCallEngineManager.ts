import { GroupCallEngine } from './GroupCallEngine';
import { useGroupCallStore } from './groupCallStore';
import { MLSGroupManager } from './mls';
import { initializeIdentityKeys, getKeyPackage } from '../services/e2ee';
import type {
  GroupCallMode,
  GroupCallPhase,
  GroupCallParticipant,
  GroupCallState,
  GroupCallEngineEvents,
  SFrameKey,
} from './types';

export interface GroupCallEngineConfig {
  callId: string;
  channelId: number;
  mode: GroupCallMode;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isCreator: boolean;
  rtpCapabilities: any;
  iceServers: any[];
  device: any;
  events: Partial<GroupCallEngineEvents>;
}

export class GroupCallEngineManager {
  private engine: GroupCallEngine | null = null;
  private config: GroupCallEngineConfig | null = null;
  private mlsGroup: any = null;

  async joinGroupCall(config: GroupCallEngineConfig): Promise<void> {
    if (this.engine) {
      await this.leaveGroupCall();
    }

    this.config = config;

    // Initialize identity keys and prekeys
    await initializeIdentityKeys();

    // Get local key package for E2EE
    const keyPackage = getKeyPackage();

    // Create engine
    this.engine = new GroupCallEngine({
      ...config,
      events: {
        onStateChange: (state) => config.events?.onStateChange?.(state),
        onParticipantJoined: (participant) => config.events?.onParticipantJoined?.(participant),
        onParticipantLeft: (userId) => config.events?.onParticipantLeft?.(userId),
        onParticipantUpdated: (participant) => config.events?.onParticipantUpdated?.(participant),
        onLocalMediaStarted: (stream) => config.events?.onLocalMediaStarted?.(stream),
        onLocalMediaStopped: (kind) => config.events?.onLocalMediaStopped?.(kind),
        onRemoteTrackReceived: (participantId, track, kind) => 
          config.events?.onRemoteTrackReceived?.(participantId, track, kind),
        onRemoteTrackRemoved: (participantId, kind) => 
          config.events?.onRemoteTrackRemoved?.(participantId, kind),
        onError: (error) => config.events?.onError?.(error),
        onConnectionStateChange: (state) => config.events?.onConnectionStateChange?.(state),
      },
    });

    // Join the call
    await this.engine.join();
  }

  async leaveGroupCall(): Promise<void> {
    if (this.engine) {
      await this.engine.leave();
      this.engine = null;
      this.config = null;
      this.mlsGroup = null;
    }
  }

  async toggleMic(): Promise<void> {
    await this.engine?.toggleMic();
  }

  async toggleCam(): Promise<void> {
    await this.engine?.toggleCam();
  }

  async startScreenShare(): Promise<void> {
    await this.engine?.startScreenShare();
  }

  async stopScreenShare(): Promise<void> {
    await this.engine?.stopScreenShare();
  }

  async toggleScreenShare(): Promise<void> {
    await this.engine?.toggleScreenShare();
  }

  getEngine(): GroupCallEngine | null {
    return this.engine;
  }

  getState(): GroupCallState | null {
    return this.engine ? useGroupCallStore.getState().state : null;
  }

  isJoined(): boolean {
    return this.engine?.isJoined ?? false;
  }

  getConnectionState(): ConnectionState {
    return this.engine ? this.engine.connectionState : 'disconnected';
  }

  async setMLSGroup(mlsGroup: any): Promise<void> {
    this.mlsGroup = mlsGroup;
    if (this.engine) {
      await this.engine.initializeSFrameKeys(mlsGroup);
    }
  }

  getMLSGroup(): any {
    return this.mlsGroup;
  }

  getLocalKeyId(): number {
    return this.engine ? this.engine.localKeyId : 0;
  }

  getSFrameKeys(): Map<number, { key: Uint8Array; salt: Uint8Array }> {
    return this.engine ? this.engine.sframeKeys : new Map();
  }
}

// Singleton instance
let engineManagerInstance: GroupCallEngineManager | null = null;

export function getGroupCallEngineManager(): GroupCallEngineManager {
  if (!engineManagerInstance) {
    engineManagerInstance = new GroupCallEngineManager();
  }
  return engineManagerInstance;
}

export function resetGroupCallEngineManager(): void {
  engineManagerInstance = null;
}