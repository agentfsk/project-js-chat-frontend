import { Server, Socket } from 'socket.io';
import { Router } from 'mediasoup/types';
import { createLogger } from './logger.js';
import { TransportManager, TransportInfo } from './transport.js';
import { mediaWorker } from './worker.js';

const logger = createLogger('signaling');

export interface GroupCallPeer {
  userId: string;
  socketId: string;
  transports: Map<string, any>;
  producers: Map<string, any>;
  consumers: Map<string, any>;
  rtpCapabilities: any;
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

      socket.on('groupCallCreate', async (data: { channelId: number; mode: 'audio' | 'video'; userId: string }, callback: Function) => {
        await this.handleGroupCallCreate(socket, data, callback);
      });

      socket.on('groupCallJoin', async (data: { callId: string; userId: string; rtpCapabilities: any }, callback: Function) => {
        await this.handleGroupCallJoin(socket, data, callback);
      });

      socket.on('groupCallLeave', async (data: { callId: string; userId: string }, callback: Function) => {
        await this.handleGroupCallLeave(socket, data, callback);
      });

      socket.on('groupCallProduce', async (data: { callId: string; kind: 'audio' | 'video'; rtpParameters: any; appData: any }, callback: Function) => {
        await this.handleGroupCallProduce(socket, data, callback);
      });

      socket.on('groupCallConsume', async (data: { callId: string; producerId: string; rtpCapabilities: any }, callback: Function) => {
        await this.handleGroupCallConsume(socket, data, callback);
      });

      socket.on('groupCallMLSMessage', async (data: { callId: string; message: any }, callback: Function) => {
        await this.handleMLSMessage(socket, data, callback);
      });

      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });
    });
  }

  private async handleGroupCallCreate(socket: Socket, data: { channelId: number; mode: 'audio' | 'video'; userId: string }, callback: Function): Promise<void> {
    try {
      const { channelId, mode, userId } = data;
      const callId = `call-${channelId}-${Date.now()}`;

      // TODO: Validate user is owner/admin of channel

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
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:YOUR_TURN_IP:3478?transport=udp', username: 'turnuser', credential: 'turnpass' },
          { urls: 'turn:YOUR_TURN_IP:5349?transport=tcp', username: 'turnuser', credential: 'turnpass' },
        ],
      });

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

      // Create transport for this peer
      const transportInfo = await transportManager.createWebRtcTransport();

      const peer: GroupCallPeer = {
        userId,
        socketId: socket.id,
        transports: new Map([[transportInfo.id, transportInfo]]),
        producers: new Map(),
        consumers: new Map(),
        rtpCapabilities,
      };

      groupCall.peers.set(userId, peer);

      // Notify existing peers about new participant
      const existingPeers = Array.from(groupCall.peers.entries())
        .filter(([uid]) => uid !== userId)
        .map(([uid, peer]) => ({
          userId: uid,
          socketId: peer.socketId,
        }));

      // Send join response to new participant
      callback({
        success: true,
        callId,
        routerRtpCapabilities: groupCall.router.rtpCapabilities,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:YOUR_TURN_IP:3478?transport=udp', username: 'turnuser', credential: 'turnpass' },
          { urls: 'turn:YOUR_TURN_IP:5349?transport=tcp', username: 'turnuser', credential: 'turnpass' },
        ],
        transport: transportInfo,
        peers: existingPeers,
      });

      // Notify existing peers about new participant
      for (const [uid, peer] of groupCall.peers) {
        if (uid !== userId) {
          this.io.to(peer.socketId).emit('groupCallPeerUpdate', {
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

  private async handleGroupCallLeave(socket: Socket, data: { callId: string; userId: string }, callback: Function): Promise<void> {
    const { callId, userId } = data;
    const groupCall = this.groupCalls.get(callId);
    if (!groupCall) {
      callback({ success: false, error: 'Group call not found' });
      return;
    }

    const peer = groupCall.peers.get(userId);
    if (peer) {
      // Close all transports for this peer
      for (const transport of peer.transports.values()) {
        transport.close();
      }
      groupCall.peers.delete(userId);

      // Notify other peers
      for (const [uid, p] of groupCall.peers) {
        this.io.to(p.socketId).emit('groupCallPeerUpdate', {
          callId,
          peerId: userId,
          joined: false,
        });
      }

      // If no peers left, clean up
      if (groupCall.peers.size === 0) {
        await this.cleanupGroupCall(callId);
      }
    }

    callback({ success: true });
    logger.info({ callId, userId }, 'Peer left group call');
  }

  private async handleGroupCallProduce(socket: Socket, data: { callId: string; kind: 'audio' | 'video'; rtpParameters: any; appData: any }, callback: Function): Promise<void> {
    try {
      const { callId, kind, rtpParameters, appData } = data;
      const groupCall = this.groupCalls.get(callId);
      if (!groupCall) {
        callback({ success: false, error: 'Group call not found' });
        return;
      }

      const peer = groupCall.peers.get(socket.id);
      if (!peer) {
        callback({ success: false, error: 'Peer not found' });
        return;
      }

      // Find the transport
      const transport = peer.transports.values().next().value;
      if (!transport) {
        callback({ success: false, error: 'No transport found' });
        return;
      }

      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { ...appData, kind, userId: socket.id },
      });

      peer.producers.set(producer.id, producer);

      callback({ success: true, producerId: producer.id });

      // Notify other peers about new producer
      for (const [uid, p] of groupCall.peers) {
        if (uid !== socket.id) {
          this.io.to(p.socketId).emit('groupCallNewProducer', {
            callId,
            producerId: producer.id,
            kind,
            producerUserId: socket.id,
          });
        }
      }

      logger.debug({ callId, producerId: producer.id, kind }, 'Producer created');
    } catch (error) {
      logger.error({ err: error, data }, 'Failed to produce');
      callback({ success: false, error: 'Failed to produce' });
    }
  }

  private async handleGroupCallConsume(socket: Socket, data: { callId: string; producerId: string; rtpCapabilities: any }, callback: Function): Promise<void> {
    try {
      const { callId, producerId, rtpCapabilities } = data;
      const groupCall = this.groupCalls.get(callId);
      if (!groupCall) {
        callback({ success: false, error: 'Group call not found' });
        return;
      }

      const peer = groupCall.peers.get(socket.id);
      if (!peer) {
        callback({ success: false, error: 'Peer not found' });
        return;
      }

      // Find the producer
      let producer: any = null;
      for (const [uid, p] of groupCall.peers) {
        if (p.producers.has(producerId)) {
          producer = p.producers.get(producerId);
          break;
        }
      }

      if (!producer) {
        callback({ success: false, error: 'Producer not found' });
        return;
      }

      // Find the transport
      const transport = peer.transports.values().next().value;
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
      });

      logger.debug({ callId, consumerId: consumer.id, producerId }, 'Consumer created');
    } catch (error) {
      logger.error({ err: error, data }, 'Failed to consume');
      callback({ success: false, error: 'Failed to consume' });
    }
  }

  private async handleMLSMessage(socket: Socket, data: { callId: string; message: any }, callback: Function): Promise<void> {
    const { callId, message } = data;
    const groupCall = this.groupCalls.get(callId);
    if (!groupCall) {
      callback({ success: false, error: 'Group call not found' });
      return;
    }

    // Broadcast MLS message to all other peers in the call
    for (const [uid, peer] of groupCall.peers) {
      if (peer.socketId !== socket.id) {
        this.io.to(peer.socketId).emit('groupCallMLSMessage', {
          callId,
          fromUserId: socket.id,
          message,
        });
      }
    }

    callback({ success: true });
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    // Find all group calls this socket is part of
    for (const [callId, groupCall] of this.groupCalls) {
      const peer = groupCall.peers.get(socket.id);
      if (peer) {
        await this.handleGroupCallLeave(socket, { callId, userId: socket.id }, () => {});
      }
    }

    logger.info({ socketId: socket.id }, 'Client disconnected');
  }

  private async cleanupGroupCall(callId: string): Promise<void> {
    const groupCall = this.groupCalls.get(callId);
    if (!groupCall) return;

    // Close router
    await mediaWorker.closeRouter(callId);

    // Clean up transport manager
    const transportManager = this.transportManagers.get(callId);
    if (transportManager) {
      transportManager.closeAll();
      this.transportManagers.delete(callId);
    }

    this.groupCalls.delete(callId);
    logger.info({ callId }, 'Group call cleaned up');
  }
}

