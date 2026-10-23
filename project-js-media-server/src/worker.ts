import { createWorker, getSupportedRtpCapabilities } from 'mediasoup';
import type { Worker, Router, RouterRtpCodecCapability } from 'mediasoup/types';
import { createLogger } from './logger.js';

const logger = createLogger('worker');

const MEDIA_CODECS: RouterRtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id': 2,
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'x-google-start-bitrate': 1000,
    },
  },
];

export class MediaWorker {
  private worker: Worker | null = null;
  private routers: Map<string, Router> = new Map();
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initWorker();
  }

  private async initWorker(): Promise<void> {
    this.worker = await createWorker({
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: 40000,
      rtcMaxPort: 40100,
    });
    this.setupWorkerEvents();
  }

  private setupWorkerEvents(): void {
    if (!this.worker) return;
    this.worker.on('died', (error: Error) => {
      logger.error({ err: error }, 'Mediasoup worker died, exiting in 2 seconds...');
      setTimeout(() => process.exit(1), 2000);
    });

    this.worker.on('@failure', (error: Error) => {
      logger.error({ err: error }, 'Mediasoup worker failure');
    });
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      throw new Error('MediaWorker not initialized');
    }
    return this.worker;
  }

  async createRouter(callId: string): Promise<Router> {
    const worker = this.ensureWorker();
    const router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });
    this.routers.set(callId, router);
    logger.info({ callId }, 'Created mediasoup router');
    return router;
  }

  getRouter(callId: string): Router | undefined {
    return this.routers.get(callId);
  }

  async closeRouter(callId: string): Promise<void> {
    const router = this.routers.get(callId);
    if (router) {
      router.close();
      this.routers.delete(callId);
      logger.info({ callId }, 'Closed mediasoup router');
    }
  }

  getRtpCapabilities() {
    return getSupportedRtpCapabilities();
  }

  async close(): Promise<void> {
    for (const [callId, router] of this.routers) {
      router.close();
      logger.info({ callId }, 'Closed mediasoup router on shutdown');
    }
    this.routers.clear();
    if (this.worker) {
      await this.worker.close();
    }
    logger.info('Mediasoup worker closed');
  }
}

export const mediaWorker = new MediaWorker();