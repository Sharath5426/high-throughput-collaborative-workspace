import { useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';

export function useOfflineSync() {
  const { setOfflineState, processOfflineQueue } = useBoardStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('🌐 Browser online event detected. Processing pending offline queue...');
      setOfflineState(false);
      processOfflineQueue();
    };

    const handleOffline = () => {
      console.log('📡 Browser offline event detected. Switching to offline sync mode...');
      setOfflineState(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setOfflineState(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineState, processOfflineQueue]);
}
