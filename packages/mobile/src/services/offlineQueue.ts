import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { STORAGE_KEYS } from '../utils/constants';
import { OfflineQueueItem } from '../types';
import api from './api';

const MAX_RETRIES = 5;

/**
 * Add an item to the offline queue.
 */
export async function enqueue(
  type: OfflineQueueItem['type'],
  data: any,
): Promise<void> {
  const queue = await getQueue();
  const item: OfflineQueueItem = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  queue.push(item);
  await saveQueue(queue);
}

/**
 * Get the current offline queue.
 */
export async function getQueue(): Promise<OfflineQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save the queue to AsyncStorage.
 */
async function saveQueue(queue: OfflineQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.OFFLINE_QUEUE,
    JSON.stringify(queue),
  );
}

/**
 * Remove an item from the queue by ID.
 */
async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await saveQueue(filtered);
}

/**
 * Get the number of pending items in the queue.
 */
export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Process and sync all queued items.
 * Returns the number of successfully synced items.
 */
export async function syncQueue(): Promise<number> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return 0;
  }

  const queue = await getQueue();
  if (queue.length === 0) {
    return 0;
  }

  let syncedCount = 0;

  for (const item of queue) {
    try {
      await processItem(item);
      await removeFromQueue(item.id);
      syncedCount++;
    } catch (error) {
      // Increment retry count
      item.retryCount++;
      if (item.retryCount >= MAX_RETRIES) {
        // Remove after max retries
        await removeFromQueue(item.id);
        console.warn(
          `[OfflineQueue] Dropped item ${item.id} after ${MAX_RETRIES} retries`,
        );
      } else {
        // Update retry count in queue
        const currentQueue = await getQueue();
        const idx = currentQueue.findIndex((q) => q.id === item.id);
        if (idx !== -1) {
          currentQueue[idx].retryCount = item.retryCount;
          await saveQueue(currentQueue);
        }
      }
    }
  }

  return syncedCount;
}

/**
 * Process a single queue item by sending it to the API.
 */
async function processItem(item: OfflineQueueItem): Promise<void> {
  switch (item.type) {
    case 'voter_count':
      await api.post('/voter-counts', item.data);
      break;
    case 'check_in':
      await api.post('/check-ins', item.data);
      break;
    case 'incident':
      await api.post('/incidents', item.data);
      break;
    case 'voter':
      await api.post('/voters', item.data);
      break;
    default:
      console.warn(`[OfflineQueue] Unknown item type: ${item.type}`);
  }
}

/**
 * Set up auto-sync when network connectivity is restored.
 */
export function setupAutoSync(
  onSyncComplete?: (count: number) => void,
): () => void {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      const count = await syncQueue();
      if (count > 0 && onSyncComplete) {
        onSyncComplete(count);
      }
    }
  });

  return unsubscribe;
}
