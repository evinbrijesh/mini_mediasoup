import * as mediasoup from 'mediasoup';
import type { Worker, WorkerSettings, WorkerLogLevel, WorkerLogTag } from 'mediasoup/node/lib/types';
import * as os from 'os';

const workerSettings: WorkerSettings = {
  logLevel: 'warn' as WorkerLogLevel,
  logTags: [
    'info',
    'ice',
    'dtls',
    'rtp',
    'srtp',
    'rtcp',
  ] as WorkerLogTag[],
  rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 10000,
  rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 11000,
};

let workers: Worker[] = [];
let nextWorkerIdx = 0;

export const createWorkers = async () => {
  const numWorkers = os.cpus().length;
  console.log(`Spawning ${numWorkers} mediasoup workers...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker(workerSettings);

    worker.on('died', () => {
      console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }
};

export const getMediasoupWorker = (): Worker => {
  const worker = workers[nextWorkerIdx];

  if (!worker) {
    throw new Error('No mediasoup worker available');
  }

  if (++nextWorkerIdx === workers.length) {
    nextWorkerIdx = 0;
  }

  return worker;
};

export const closeWorkers = () => {
  workers.forEach((worker) => {
    try {
      worker.close();
    } catch {
      // ignore cleanup errors
    }
  });
  workers = [];
  nextWorkerIdx = 0;
};
