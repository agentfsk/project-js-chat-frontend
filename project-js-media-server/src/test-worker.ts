import { mediaWorker } from './worker.js';

// Wait for worker to initialize
await new Promise(resolve => setTimeout(resolve, 1000));

// Test router creation
const router = await mediaWorker.createRouter('test-call-id');
console.log('Router created:', router.id);

// Test RTP capabilities
const caps = mediaWorker.getRtpCapabilities();
console.log('RTP capabilities:', JSON.stringify(caps, null, 2));

// Close router
await mediaWorker.closeRouter('test-call-id');
console.log('Router closed');

// Clean shutdown
await mediaWorker.close();
console.log('Worker closed');

process.exit(0);