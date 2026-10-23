import { Router, WebRtcTransport, TransportListenInfo, WebRtcTransportOptions } from 'mediasoup/types';
import { createLogger } from './logger.js';

const logger = createLogger('transport');

export interface TransportInfo {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
}

export class TransportManager {
  private router: Router;
  private transports: Map<string, any> = new Map();
  private listenInfo: TransportListenInfo;

  constructor(router: Router, listenInfo: TransportListenInfo) {
    this.router = router;
    this.listenInfo = listenInfo;
  }

  async createWebRtcTransport(options: Partial<any> = {}): Promise<any> {
    const transport = await this.router.createWebRtcTransport({
      listenInfos: [this.listenInfo],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
      ...options,
    });

    this.transports.set(transport.id, transport);

    logger.debug({ transportId: transport.id }, 'WebRTC transport created');

    return this.getTransportInfo(transport);
  }

  getTransport(transportId: string): any {
    return this.transports.get(transportId);
  }

  async connectTransport(transportId: string, dtlsParameters: any): Promise<void> {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} not found`);
    }
    await transport.connect({ dtlsParameters });
    logger.debug({ transportId }, 'Transport connected');
  }

  getTransportInfo(transport: any): TransportInfo {
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  closeTransport(transportId: string): void {
    const transport = this.transports.get(transportId);
    if (transport) {
      transport.close();
      this.transports.delete(transportId);
      logger.debug({ transportId }, 'Transport closed');
    }
  }

  closeAll(): void {
    for (const [id, transport] of this.transports) {
      transport.close();
    }
    this.transports.clear();
  }
}