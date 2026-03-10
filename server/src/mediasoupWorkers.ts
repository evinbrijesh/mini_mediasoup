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
  rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 20000,
};

let workers: Worker[] = [];
let nextWorkerIdx = 0;

// BUG-022: Cap worker count to avoid spawning too many processes on large machines
const MAX_WORKERS = 4;

const createWorker = async (): Promise<Worker> => {
  const worker = await mediasoup.createWorker(workerSettings);

  // BUG-021: Replace the dead worker instead of exiting the entire process
  worker.on('died', async () => {
    console.error(
      `mediasoup worker [pid:${worker.pid}] died — replacing it in 2 seconds...`
    );
    setTimeout(async () => {
      try {
        const idx = workers.indexOf(worker);
        if (idx !== -1) {
          const replacement = await createWorker();
          workers[idx] = replacement;
          console.log(`mediasoup worker replaced at index ${idx} [pid:${replacement.pid}]`);
        }
      } catch (err) {
        console.error('Failed to replace mediasoup worker — exiting:', err);
        process.exit(1);
      }
    }, 2000);
  });

  return worker;
};

export const createWorkers = async () => {
  const numCpus = os.cpus().length;
  const numWorkers = Math.min(numCpus, MAX_WORKERS);
  console.log(`Spawning ${numWorkers} mediasoup workers (CPUs: ${numCpus}, cap: ${MAX_WORKERS})...`);

  for (let i = 0; i < numWorkers; i++) {
    workers.push(await createWorker());
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
