// src/hooks/useNetworkStatus.js
// Hook لمراقبة حالة الاتصال بالإنترنت والعمليات المعلقة للمزامنة

import { useState, useEffect, useCallback } from 'react';
import syncEngine from '../utils/syncEngine';
import { getSyncQueueCount } from '../utils/indexedDB';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(syncEngine.isSyncing);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    } catch (_) {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      refreshCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // الاشتراك في أحداث محرك المزامنة
    const unsubscribe = syncEngine.subscribe((event) => {
      if (event.type === 'SYNC_STARTED') {
        setIsSyncing(true);
      } else if (event.type === 'SYNC_FINISHED') {
        setIsSyncing(false);
        setPendingCount(event.pendingCount);
        setLastSyncResult(event);
      } else if (event.type === 'IDLE') {
        setIsSyncing(false);
        setPendingCount(event.pendingCount || 0);
      }
    });

    // استماع لحدث إضافة عملية جديدة محلياً لتحديث العداد
    const handleQueueUpdated = () => {
      refreshCount();
    };
    window.addEventListener('crm_queue_updated', handleQueueUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('crm_queue_updated', handleQueueUpdated);
      unsubscribe();
    };
  }, [refreshCount]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      alert('لا يمكن المزامنة حالياً لعدم وجود اتصال بالإنترنت');
      return;
    }
    return await syncEngine.syncAll();
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    syncNow,
    refreshCount,
  };
}
