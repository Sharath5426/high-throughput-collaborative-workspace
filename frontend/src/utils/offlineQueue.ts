import { PendingOperation } from '../types';

const STORAGE_KEY = 'collaborative_workspace_offline_sync_queue';

export function saveOfflineQueue(queue: PendingOperation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to persist offline sync queue to storage:', err);
  }
}

export function loadOfflineQueue(): PendingOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingOperation[];
  } catch (err) {
    console.error('Failed to load offline sync queue from storage:', err);
    return [];
  }
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear offline sync queue storage:', err);
  }
}
