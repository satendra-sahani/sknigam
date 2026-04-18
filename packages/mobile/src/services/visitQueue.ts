import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from './api';
import { uploadImage, generateFileName } from './imageUpload';
import type { QueuedVisit } from '../types';

const QUEUE_KEY = '@visit_queue_v1';

type Listener = (queue: QueuedVisit[]) => void;
const listeners = new Set<Listener>();

async function readQueue(): Promise<QueuedVisit[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedVisit[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedVisit[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  listeners.forEach((l) => l(queue));
}

export async function getQueue(): Promise<QueuedVisit[]> {
  return readQueue();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  readQueue().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function enqueueVisit(
  entry: Omit<QueuedVisit, 'id' | 'createdAt' | 'attempts'>,
): Promise<QueuedVisit> {
  const queue = await readQueue();
  const queued: QueuedVisit = {
    ...entry,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  queue.push(queued);
  await writeQueue(queue);
  return queued;
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((q) => q.id !== id));
}

async function submitOne(item: QueuedVisit): Promise<void> {
  const payload = { ...item.payload };
  if (item.photoUri) {
    const uploaded = await uploadImage(
      item.photoUri,
      generateFileName(`visit_${item.voterId}`),
      '/pollstics/voter-visits',
    );
    payload.voterPhoto = uploaded.url;
  }
  await api.put(`/voters/${item.voterId}`, payload);
}

export async function trySubmitNow(
  entry: Omit<QueuedVisit, 'id' | 'createdAt' | 'attempts'>,
): Promise<{ submitted: boolean; queued?: QueuedVisit }> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    const queued = await enqueueVisit(entry);
    return { submitted: false, queued };
  }
  try {
    await submitOne({ ...entry, id: 'tmp', createdAt: '', attempts: 0 });
    return { submitted: true };
  } catch (err: any) {
    const queued = await enqueueVisit({ ...entry, lastError: err?.message || 'submit failed' });
    return { submitted: false, queued };
  }
}

let flushing = false;

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (flushing) return { flushed: 0, remaining: (await readQueue()).length };
  flushing = true;
  let flushed = 0;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return { flushed: 0, remaining: (await readQueue()).length };

    let queue = await readQueue();
    for (const item of [...queue]) {
      try {
        await submitOne(item);
        queue = queue.filter((q) => q.id !== item.id);
        await writeQueue(queue);
        flushed++;
      } catch (err: any) {
        const next = queue.map((q) =>
          q.id === item.id
            ? { ...q, attempts: q.attempts + 1, lastError: err?.message || 'submit failed' }
            : q,
        );
        queue = next;
        await writeQueue(queue);
        if (err?.response?.status && err.response.status < 500 && err.response.status !== 401) {
          // 4xx other than auth — leave it; the user must edit/delete manually
          continue;
        }
        // Network / 5xx — stop flushing to avoid hammering
        break;
      }
    }
    return { flushed, remaining: queue.length };
  } finally {
    flushing = false;
  }
}

let unsubscribeNet: (() => void) | null = null;

export function startAutoFlush(): () => void {
  if (unsubscribeNet) return unsubscribeNet;
  unsubscribeNet = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      flushQueue().catch(() => {});
    }
  });
  // initial attempt
  flushQueue().catch(() => {});
  return unsubscribeNet;
}
