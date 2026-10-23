import { Server } from 'socket.io';
import { createServer } from 'http';
import { createLogger } from './logger.js';
import { mediaWorker } from './worker.js';
import { SignalingHandler } from './signaling.js';

const logger = createLogger('server');

const PORT = parseInt(process.env.PORT || '3001', 10);
const MEDIASOUP_LISTEN_IP = process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0';
const MEDIASOUP_ANNOUNCED_IP = process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const listenInfo = {
  ip: MEDIASOUP_LISTEN_IP,
  announcedIp: MEDIASOUP_ANNOUNCED_IP,
  portRange: { min: 40000, max: 40100 },
};

const signalingHandler = new SignalingHandler(io, {
  ip: MEDIASOUP_LISTEN_IP,
  announcedIp: MEDIASOUP_ANNOUNCED_IP,
  portRange: { min: 40000, max: 40100 },
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'New socket connection');
});

httpServer.listen(PORT, () => {
  logger.info({ port: PORT, listenIp: MEDIASOUP_LISTEN_IP, announcedIp: MEDIASOUP_ANNOUNCED_IP }, 'Media server started');
});

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await mediaWorker.close();
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await mediaWorker.close();
  httpServer.close();
  process.exit(0);
});