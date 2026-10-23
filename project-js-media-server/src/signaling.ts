import { Server, Socket } from 'socket.io';
import { Router } from 'mediasoup/types';
import { createLogger } from './logger.js';
import { TransportManager, TransportInfo } from './transport.js';
import { mediaWorker } from './worker.js';

const logger = createLogger('signaling');

export interface GroupCallPeer {
  userId: string;
  socketId: string;
  sendTransport: any;
  recvTransport: any;
  producers: Map<string, any>;
  consumers: Map<string, any>;
  rtpCapabilities: any;
  updates: Record<string, unknown>;
}

export interface GroupCall {
  callId: string;
  channelId: number;
  mode: 'audio' | 'video';
  creatorId: string;
  router: Router;
  peers: Map<string, GroupCallPeer>;
  createdAt: Date;
}

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
];

export class SignalingHandler {
  private io: Server;
  private groupCalls: Map<string, GroupCall> = new Map();
  private transportManagers: Map<string, TransportManager> = new Map();
  private listenInfo: any;

  constructor(io: Server, listenInfo: any) {
    this.io = io;
    this.listenInfo = listenInfo;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info({ socketId: socket.id }, 'Client connected');

      socket.on('groupCallCreate', async (data: { callId?: string; channelId: number; mode: 'audio' | 'video'; userId: string }, callback: Function = () => {}) => {
        await this.handleGroupCallCreate(socket, data, callback);
      });

      socket.on('groupCallJoin', async (data: { callId: string; userId: string; rtpCapabilities: any }, callback: Function = () => {}) => {
        await this.handleGroupCallJoin(socket, data, callback);
      });

      socket.on('groupCallTransportConnect', async (data: { callId: string; transportId: string; dtlsParameters: any }, callback: Function = () => {}) => {
        await this.handleTransportConnect(data, callback);
      });

      socket.on('groupCallLeave', async (data: { callId: string; userId: string }, callback: Function = () => {}) => {
        await this.handleGroupCallLeave(data, callback);
      });

      socket.on('groupCallProduce', async (data: { callId: string; userId: string; kind: 'audio' | 'video'; rtpParameters: any; appData: any }, callback: Function = () => {}) => {
        await this.handleGroupCallProduce(data, callback);
      });

      socket.on('groupCallConsume', async (data: { callId: string; userId: string; producerId: string; rtpCapabilities: any }, callback: Function = () => {}) => {
        await this.handleGroupCallConsume(data, callback);
      });

      socket.on('groupCallPeerUpdate', (data: { callId: string; userId: string; updates: Record<string, unknown> }, callback: Function = () => {}) => {
        this.handlePeerUpdate(data, callback);
      });

      socket.on('groupCallMLSMessage', (data: { callId: string; userId: string; message: any }, callback: Function = () => {}) => {
        this.handleMLSMessage(socket, data, callback);
      });

      socket.on('groupCallKick', (data: { callId: string; targetUserId: string }, callback: Function = () => {}) => {
        this.handleKick(data, callback);
      });

      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });
    });
  }

  private findPeerBySocket(groupCall: GroupCall, socketId: string): GroupCallPeer | null {
    for (const peer of groupCall.peers.values()) {
      if (peer.socketId === socketId) return peer;
    }
    return null;
  }

  private async handleGroupCallCreate(socket: Socket, data: { callId?: string; channelId: number; mode: 'audio' | 'video'; userId: string }, callback: Function): Promise<void> {
    try {
      const { channelId, mode, userId } = data;
      const callId = data.callId || `call-${channelId}-${Date.now()}`;

      const existing = this.groupCalls.get(callId);
      if (existing) {
        callback({
          success: true,
          callId,
          routerRtpCapabilities: existing.router.rtpCapabilities,
          iceServers: DEFAULT_ICE_SERVERS,
        });
        return;
      }

      const router = await mediaWorker.createRouter(callId);
      const transportManager = new TransportManager(router, this.listenInfo);

      const groupCall: GroupCall = {
        callId,
        channelId,
        mode,
        creatorId: userId,
        router,
        peers: new Map(),
        createdAt: new Date(),
      };

      this.groupCalls.set(callId, groupCall);
      this.transportManagers.set(callId, transportManager);

      callback({
        success: true,
        callId,
        routerRtpCapabilities: router.rtpCapabilities,
        iceServers: DEFAULT_ICE_SERVERS,
      });

      socket.join(`group:${callId}`);
      logger.info({ callId, channelId, mode, creatorId: userId }, 'Group call created');
    } catch (error) {
      logger.error({ err: error, data }, 'Failed to create group call');
      callback({ success: false, error: 'Failed to create group call' });
    }
  }

  private async handleGroupCallJoin(socket: Socket, data: { callId: string; userId: string; rtpCapabilities: any }, callback: Function): Promise<void> {
    try {
      const { callId, userId, rtpCapabilities } = data;
      const groupCall = this.groupCalls.get(callId);
      if (!groupCall) {
        callback({ success: false, error: 'Group call not found' });
        return;
      }

      const transportManager = this.transportManagers.get(callId);
      if (!transportManager) {
        callback({ success: false, error: 'Transport manager not found' });
        return;
      }

      let peer = groupCall.peers.get(userId);
      if (peer) {
        peer.socketId = socket.id;
      } else {
        const sendTransport = await transportManager.createWebRtcTransport();
        const recvTransport = await transportManager.createWebRtcTransport();
        peer = {
          userId,
          socketId: socket.id,
          sendTransport,
          recvTransport,
          producers: new Map(),
          consumers: new Map(),
          rtpCapabilities,
          updates: {},
        };
        groupCall.peers.set(userId, peer);
      }

      socket.join(`group:${callId}`);

      const producers: Array<{ producerId: string; producerUserId: string; kind: string; appData: any }> = [];
      for (const [producerUserId, otherPeer] of groupCall.peers) {
        if (producerUserId === userId) continue;
        for (const [producerId, producer] of otherPeer.producers) {
          producers.push({
            producerId,
            producerUserId,
            kind: producer.kind,
            appData: producer.appData,
          });
        }
      }

      const peers = Array.from(groupCall.peers.values())
        .filter((other) => other.userId !== userId)
        .map((other) => ({ userId: other.userId, updates: other.updates }));

      callback({
        success: true,
        callId,
        routerRtpCapabilities: groupCall.router.rtpCapabilities,
        iceServers: DEFAULT_ICE_SERVERS,
        sendTransport: peer.sendTransport,
        recvTransport: peer.recvTransport,
        peers,
        producers,
      });

      for (const other of groupCall.peers.values()) {
        if (other.userId !== userId) {
          this.io.to(other.socketId).emit('groupCallPeerUpdate', {
            callId,
            peerId: userId,
            joined: true,
          });
        }
      }

      logger.info({ callId, userId }, 'Peer joined group call');
    } catch (error) {
      logger.error({ err: error, data }, 'Failed to join group call');
      callback({ success: false, error: 'Failed to join group call' });
    }
  }

  private async handleTransportConnect(data: { callId: string; transportId: string; dtlsParameters: any }, callback: Function): Promise<void> {
    try {
      const transportManager = this.transportManagers.get(data.callId);
      if (!transportManager) {
        callback({ success: false, error: 'Group call not found' });
        return;
      }
      await transportManager.connectTransport(data.transportId, data.dtlsParameters);
      callback({ success: true });
    } catch (error) {
      logger.error({ err: error, data }, 'Failed to connect transport');
      callback({ success: false, error: 'Failed to connect transport' });
    }
  }

  private async handleGroupCallLeave(data: { callId: string; userId: string }, callback: Function): Promise<void> {
    const { callId, userId } = data;
    const groupCall = this.groupCalls.get(callId);
    if (!groupCall) {
      callback({ success: false, error: 'Group call not found' });
      return;
    }

    await this.removePeer(groupCall, userId);
    callback({ success: true });
    logger.info({ callId, userId }, 'Peer left group call');
  }

  private async removePeer(groupCall: GroupCall, userId: string): Promise<void> {
    const peer = groupCall.peers.get(userId);
    if (!peer) return;

    const transportManager = this.transportManagers.get(groupCall.callId);
    if (transportManager) {
      if (peer.sendTransport?.id) transportManager.closeTransport(peer.sendTransport.id);
      if (peer.recvTransport?.id) transportManager.closeTransport(peer.recvTransport.id);
    }

    for (const producer of peer.producers.values()) producer.close();
    for (const consumer of peer.consumers.values()) consumer.close();
    peer.producers.clear();
    peer.consumers.clear();

    groupCall.peers.delete(userId);

    for (const other of groupCall.peers.values()) {
      this.io.to(other.socketId).emit('groupCallPeerLeft', {
        callId: groupCall.callId,
        peerId: userId,
      });
    }

    if (groupCall.peers.size === 0) {
      await this.cleanupGroupCall(groupCall.callId);
    }
  }

  private async handleGroupCallProduce(data: { callId: string; userId: string; kind: 'audio' | 'video'; rtpParameters: any; appData: any }, callback: Function): Promise<void> {
    try {
      const { callId, userId, kind, rtpParameters, appData } = data;
      const groupCall = this.groupCalls.get(callId);
      if (!groupCall) {
        callback({ success: false, error: 'Group call not found' });
        return;
      }

      const peer = groupCall.peers.get(userId);
      if (!peer) {
        callback({ success: false, error: 'Peer not found' });
        return;
      }

      const transportManager = this.transportManagers.get(callId);
      const transport = transportManager?.getTransport(peer.sendTransport?.id);
      if (!transport) {
        callback({ success: false, error: 'No transport found' });
        return;
      }

      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { ...appData, kind, userId },
      });

      peer.producers.set(producer.id, producer);

      callback({ success: true, producerId: producer.id });

      for (const [uid, other] of groupCall.peers) {
        if (uid !== userId) {
          this.io.to(other.socketId).emit('groupCallNewProducer', {
            callId,
            producerId: producer.id,
            kind,
            producerUserId: userId,
            appData,
          });
        }
      }

      logger.debug({ callId, producerId: producer.id, kind }, 'Producer created');
    } catch (error) {
      logger.error({ err: error, data }, 'Failed to produce');
      callback({ success: false, error: 'Failed to produce' });
    }
  }

  private async handleGroupCallConsume(data: { callId: string; userId: string; producerId: string; rtpCapabilities: any }, callback: Function): Promise<void> {
    try {
      const { callId, userId, producerId, rtpCapabilities } = data;
      const groupCall = this.groupCalls.get(callId);
      if (!groupCall) {
        callback({ success: false, error: 'Group call not found' });
        return;
      }

      const peer = groupCall.peers.get(userId);
      if (!peer) {
        callback({ success: false, error: 'Peer not found' });
        return;
      }

      let producer: any = null;
      for (const other of groupCall.peers.values()) {
        if (other.producers.has(producerId)) {
          producer = other.producers.get(producerId);
          break;
        }
      }

      if (!producer) {
        callback({ success: false, error: 'Producer not found' });
        return;
      }

      const transportManager = this.transportManagers.get(callId);
      const transport = transportManager?.getTransport(peer.recvTransport?.id);
      if (!transport) {
        callback({ success: false, error: 'No transport found' });
        return;
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });

      peer.consumers.set(consumer.id, consumer);

      callback({
        success: true,
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        appData: consumer.appData,
      });

      logger.debug({ callId, consumerId: consumer.id, producerId }, 'Consumer created');
    } catch (error) {
      logger.error({ err: error, data }, 'Failed to consume');
      callback({ success: false, error: 'Failed to consume' });
    }
  }

  private handlePeerUpdate(data: { callId: string; userId: string; updates: Record<string, unknown> }, callback: Function): void {
    const groupCall = this.groupCalls.get(data.callId);
    const peer = groupCall?.peers.get(data.userId);
    if (!groupCall || !peer) {
      callback({ success: false, error: 'Peer not found' });
      return;
    }

    peer.updates = { ...peer.updates, ...data.updates };

    for (const other of groupCall.peers.values()) {
      if (other.userId !== data.userId) {
        this.io.to(other.socketId).emit('groupCallPeerUpdate', {
          callId: data.callId,
          peerId: data.userId,
          updates: data.updates,
        });
      }
    }

    callback({ success: true });
  }

  private handleMLSMessage(socket: Socket, data: { callId: string; userId: string; message: any }, callback: Function): void {
    const { callId, message, userId } = data;
    const groupCall = this.groupCalls.get(callId);
    if (!groupCall) {
      callback({ success: false, error: 'Group call not found' });
      return;
    }

    for (const other of groupCall.peers.values()) {
      if (other.userId !== userId) {
        this.io.to(other.socketId).emit('groupCallMLSMessage', {
          callId,
          fromUserId: userId,
          message,
        });
      }
    }

    callback({ success: true });
  }

  private async handleKick(data: { callId: string; targetUserId: string }, callback: Function): Promise<void> {
    const groupCall = this.groupCalls.get(data.callId);
    if (!groupCall) {
      callback({ success: false, error: 'Group call not found' });
      return;
    }

    const peer = groupCall.peers.get(data.targetUserId);
    if (!peer) {
      callback({ success: false, error: 'Peer not found' });
      return;
    }

    this.io.to(peer.socketId).emit('groupCallKicked', { callId: data.callId });
    await this.removePeer(groupCall, data.targetUserId);
    callback({ success: true });
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    for (const groupCall of this.groupCalls.values()) {
      const peer = this.findPeerBySocket(groupCall, socket.id);
      if (peer) {
        await this.removePeer(groupCall, peer.userId);
      }
    }

    logger.info({ socketId: socket.id }, 'Client disconnected');
  }

  private async cleanupGroupCall(callId: string): Promise<void> {
    const groupCall = this.groupCalls.get(callId);
    if (!groupCall) return;

    await mediaWorker.closeRouter(callId);

    const transportManager = this.transportManagers.get(callId);
    if (transportManager) {
      transportManager.closeAll();
      this.transportManagers.delete(callId);
    }

    this.groupCalls.delete(callId);
    logger.info({ callId }, 'Group call cleaned up');
  }
}
