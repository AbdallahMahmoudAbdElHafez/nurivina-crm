// src/hooks/useOfflineSync.js
// يراقب الاتصال بالإنترنت، وعند العودة يرسل كل البيانات والمواقع المحفوظة offline

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import syncEngine from '../utils/syncEngine';
import { addToSyncQueue, updateCachedItemInList } from '../utils/indexedDB';

const STORAGE_KEY = 'pendingLocations';

// متوافق مع الكود السابق لجلب المواقع المعلقة
export function getPendingLocations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

// متوافق مع الكود السابق لحفظ الموقع مع ربطه بمحرك المزامنة الجديد
export async function savePendingLocation(visitId, lat, lng, sharedAt = new Date().toISOString()) {
  // 2. تحديث الكاش المحلي فوراً لتظهر الإحداثيات في الجدول فوراً
  await updateCachedItemInList('visits', 'visit_id', visitId, {
    shared_lat: lat,
    shared_lng: lng,
    shared_at: sharedAt,
  });

  // 3. إضافة العملية لطابور المزامنة الذكي
  await addToSyncQueue({
    type: 'SHARE_LOCATION',
    endpoint: `/visits/${visitId}/share-location`,
    method: 'POST',
    payload: { lat, lng, sharedAt },
    metadata: { visitId, sharedAt },
  });

  // إشعار التطبيق بتحديث طابور المزامنة
  window.dispatchEvent(new CustomEvent('crm_queue_updated'));

  // إذا كنا متصلين، ابدأ المزامنة فوراً
  if (navigator.onLine) {
    syncEngine.syncAll();
  }
}

// حفظ إنهاء الزيارة (تمت/لم تتم) مع ملاحظات وموقع الخروج مع دعم الأوفلاين
export async function savePendingCompleteVisit(visitId, outcome, notes, exitLat, exitLng, exitAt = new Date().toISOString()) {
  const isCompleted = outcome === 'completed';
  const fields = {
    notes,
    exit_lat: exitLat,
    exit_lng: exitLng,
    exit_at: exitAt,
    visit_outcome: outcome,
    ...(isCompleted ? {} : { status: 'not_visited' }),
  };

  // 1. تحديث الكاش المحلي فوراً
  await updateCachedItemInList('visits', 'visit_id', visitId, fields);

  // 2. إضافة العملية لطابور المزامنة
  await addToSyncQueue({
    type: 'COMPLETE_VISIT',
    endpoint: `/visits/${visitId}/complete`,
    method: 'POST',
    payload: {
      outcome,
      notes,
      exit_lat: exitLat,
      exit_lng: exitLng,
      exit_at: exitAt,
    },
    metadata: { visitId, outcome, exitAt },
  });

  // إشعار التطبيق
  window.dispatchEvent(new CustomEvent('crm_queue_updated'));

  // محاولة المزامنة الفورية إذا كان متصلاً
  if (navigator.onLine) {
    syncEngine.syncAll();
  }
}

// ترحيل أي مواقع قديمة مخزنة في localStorage إلى طابور المزامنة الجديد
async function migrateLegacyPendingLocations() {
  const legacy = getPendingLocations();
  if (legacy.length === 0) return;

  for (const item of legacy) {
    await addToSyncQueue({
      type: 'SHARE_LOCATION',
      endpoint: `/visits/${item.visitId}/share-location`,
      method: 'POST',
      payload: { lat: item.lat, lng: item.lng, sharedAt: item.sharedAt },
      metadata: { visitId: item.visitId },
    });
  }

  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('crm_queue_updated'));
}

export default function useOfflineSync() {
  const token = useSelector((state) => state.auth.token);
  useEffect(() => {
    if (!token) return;
    // ترحيل البيانات السابقة ومحاولة المزامنة عند بدء التطبيق
    migrateLegacyPendingLocations().then(() => {
      if (navigator.onLine) {
        syncEngine.syncAll();
      }
    });

  }, [token]);
}
