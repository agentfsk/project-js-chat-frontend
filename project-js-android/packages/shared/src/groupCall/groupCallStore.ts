import { create } from 'zustand';
import type {
  GroupCallState,
  GroupCallParticipant,
  GroupCallPhase,
  GroupCallMode,
  GroupCallRole,
  ProducerInfo,
  ConsumerInfo,
} from './types';

type GroupCallStore = {
  state: GroupCallState | null;
  producers: Map<string, ProducerInfo>;
  consumers: Map<string, ConsumerInfo>;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  localScreenTrack: MediaStreamTrack | null;

  initialize: (initialState: Omit<GroupCallState, 'participants'> & { participants?: GroupCallParticipant[] }) => void;
  reset: () => void;
  setPhase: (phase: GroupCallPhase) => void;
  setLocalParticipant: (participant: GroupCallParticipant | null) => void;
  addParticipant: (participant: GroupCallParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<GroupCallParticipant>) => void;
  addProducer: (producer: ProducerInfo) => void;
  removeProducer: (producerId: string) => void;
  addConsumer: (consumer: ConsumerInfo) => void;
  removeConsumer: (consumerId: string) => void;
  setLocalAudioTrack: (track: MediaStreamTrack | null) => void;
  setLocalVideoTrack: (track: MediaStreamTrack | null) => void;
  setLocalScreenTrack: (track: MediaStreamTrack | null) => void;
  clearLocalTracks: () => void;
}

const initialState: GroupCallState = {
  callId: '',
  channelId: 0,
  mode: 'audio',
  phase: 'idle',
  creatorId: '',
  participants: new Map(),
  localParticipant: null,
  createdAt: new Date(),
  startedAt: null,
  endedAt: null,
  sframeKeys: new Map(),
  localKeyId: 0,
};

export const useGroupCallStore = create<GroupCallStore>((set, get) => ({
  state: null,
  producers: new Map(),
  consumers: new Map(),
  localAudioTrack: null,
  localVideoTrack: null,
  localScreenTrack: null,

  initialize: (initialState) => {
    const participants = new Map<string, GroupCallParticipant>();
    initialState.participants?.forEach((p) => {
      participants.set(p.userId, p);
    });

    const state: GroupCallState = {
      ...initialState,
      participants,
      localParticipant: participants.get(initialState.creatorId) || null,
      sframeKeys: initialState.sframeKeys || new Map(),
      localKeyId: initialState.localKeyId ?? 0,
    };

    set({ state, producers: new Map(), consumers: new Map() });
  },

  reset: () => {
    const { localAudioTrack, localVideoTrack, localScreenTrack } = get();
    localAudioTrack?.stop();
    localVideoTrack?.stop();
    localScreenTrack?.stop();
    
    get().producers.forEach((p) => p.id && console.log(`Producer ${p.id} would be closed`));
    get().consumers.forEach((c) => c.id && console.log(`Consumer ${c.id} would be closed`));

    set({
      state: null,
      producers: new Map(),
      consumers: new Map(),
      localAudioTrack: null,
      localVideoTrack: null,
      localScreenTrack: null,
    });
  },

  setPhase: (phase: GroupCallPhase) => {
    const state = get().state;
    if (!state) return;
    
    set({
      state: {
        ...state,
        phase,
        startedAt: phase === 'joined' ? new Date() : state.startedAt,
        endedAt: phase === 'ended' ? new Date() : state.endedAt,
      },
    });
  },

  setLocalParticipant: (participant: GroupCallParticipant | null) => {
    const state = get().state;
    if (!state) return;
    
    set({
      state: { ...state, localParticipant: participant },
    });
  },

  addParticipant: (participant: GroupCallParticipant) => {
    const state = get().state;
    if (!state) return;
    
    const participants = new Map(state.participants);
    participants.set(participant.userId, participant);
    
    set({
      state: { ...state, participants },
    });
  },

  removeParticipant: (userId: string) => {
    const state = get().state;
    if (!state) return;
    
    const participants = new Map(state.participants);
    participants.delete(userId);
    
    const localParticipant = state.localParticipant?.userId === userId ? null : state.localParticipant;
    
    set({
      state: { ...state, participants, localParticipant },
    });
  },

  updateParticipant: (userId: string, updates: Partial<GroupCallParticipant>) => {
    const state = get().state;
    if (!state) return;
    
    const participant = state.participants.get(userId);
    if (!participant) return;
    
    const participants = new Map(state.participants);
    participants.set(userId, { ...participant, ...updates });
    
    const localParticipant = state.localParticipant?.userId === userId
      ? { ...state.localParticipant, ...updates }
      : state.localParticipant;
    
    set({
      state: { ...state, participants, localParticipant },
    });
  },

  addProducer: (producer: ProducerInfo) => {
    const producers = new Map(get().producers);
    producers.set(producer.id, producer);
    set({ producers });
  },

  removeProducer: (producerId: string) => {
    const producers = new Map(get().producers);
    producers.delete(producerId);
    set({ producers });
  },

  addConsumer: (consumer: ConsumerInfo) => {
    const consumers = new Map(get().consumers);
    consumers.set(consumer.id, consumer);
    set({ consumers });
  },

  removeConsumer: (consumerId: string) => {
    const consumers = new Map(get().consumers);
    consumers.delete(consumerId);
    set({ consumers });
  },

  setLocalAudioTrack: (track: MediaStreamTrack | null) => {
    set({ localAudioTrack: track });
  },

  setLocalVideoTrack: (track: MediaStreamTrack | null) => {
    set({ localVideoTrack: track });
  },

  setLocalScreenTrack: (track: MediaStreamTrack | null) => {
    set({ localScreenTrack: track });
  },

  clearLocalTracks: () => {
    const { localAudioTrack, localVideoTrack, localScreenTrack } = get();
    localAudioTrack?.stop();
    localVideoTrack?.stop();
    localScreenTrack?.stop();
    set({ localAudioTrack: null, localVideoTrack: null, localScreenTrack: null });
  },
}));