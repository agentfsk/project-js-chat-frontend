import type { Device, Producer, Consumer, Transport, RtpCapabilities, RtpParameters } from 'mediasoup-client/types';

export type GroupCallMode = 'audio' | 'video';

export type GroupCallPhase = 'idle' | 'connecting' | 'joined' | 'leaving' | 'ended';

export type GroupCallRole = 'creator' | 'admin' | 'participant';

export interface GroupCallParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: GroupCallRole;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  joinedAt: Date;
  sframeKeyId?: number;
}

export interface GroupCallState {
  callId: string;
  channelId: number;
  mode: GroupCallMode;
  phase: GroupCallPhase;
  creatorId: string;
  participants: Map<string, GroupCallParticipant>;
  localParticipant: GroupCallParticipant | null;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  sframeKeys: Map<number, SFrameKey>;
  localKeyId: number;
}

export interface GroupCallEngineEvents {
  onStateChange: (state: GroupCallState) => void;
  onParticipantJoined: (participant: GroupCallParticipant) => void;
  onParticipantLeft: (userId: string) => void;
  onParticipantUpdated: (participant: GroupCallParticipant) => void;
  onLocalMediaStarted: (stream: MediaStream) => void;
  onLocalMediaStopped: (kind: 'audio' | 'video') => void;
  onRemoteTrackReceived: (participantId: string, track: MediaStreamTrack, kind: 'audio' | 'video' | 'screen') => void;
  onRemoteTrackRemoved: (participantId: string, kind: 'audio' | 'video' | 'screen') => void;
  onError: (error: Error) => void;
  onConnectionStateChange: (state: ConnectionState) => void;
  onTransportConnect: (params: { transportId: string; dtlsParameters: any }) => Promise<void>;
  onProduce: (params: { kind: 'audio' | 'video'; rtpParameters: any; appData: any }) => Promise<{ producerId: string }>;
  onStats?: (stats: any) => void;
  onPhaseChange?: (phase: GroupCallPhase) => void;
  onMLSMessage?: (params: { callId: string; message: any }) => Promise<void>;
}

export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export interface GroupCallEngineConfig {
  callId: string;
  channelId: number;
  mode: GroupCallMode;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isCreator: boolean;
  rtpCapabilities: any;
  iceServers: RTCIceServer[];
  device: any;
  appData: { userId: string; isScreenShare?: boolean; source?: string; keyId?: number };
  events: Partial<GroupCallEngineEvents>;
}

export interface MediaStats {
  audioLevel: number;
  bitrate: number;
  packetsLost: number;
  packetsReceived: number;
  rtt: number;
  jitter: number;
}

export interface ProducerInfo {
  id: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  appData: {
    userId: string;
    isScreenShare: boolean;
  };
}

export interface ConsumerInfo {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  producerUserId: string;
  isScreenShare: boolean;
}

export interface SFrameKey {
  keyId: number;
  key: Uint8Array;
  salt: Uint8Array;
}