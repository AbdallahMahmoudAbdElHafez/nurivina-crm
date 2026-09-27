// src/utils/indexedDB.js
// محرك تخزين محلي يعتمد على IndexedDB لتخزين البيانات وقائمة الانتظار بدون اتصال

const DB_NAME = 'crm_offline_db';
const DB_VERSION = 1;

let dbInstance = null;

export function openDatabase() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB غير مدعوم في هذا المتصفح');
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. طابور المزامنة للعمليات المعلقة
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
      }

      // 2. كاش البيانات المحلية (الأطباء، العيادات، الزيارات، خطط الزيارات، المناطق)
      if (!db.objectStoreNames.contains('offline_cache')) {
        db.createObjectStore('offline_cache', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('فشل فتح IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ─── دوال التعامل مع طابور المزامنة (Sync Queue) ──────────────────────────

export async function addToSyncQueue(item) {
  try {
    const db = await openDatabase();
    if (!db) return fallbackSaveToLocalStorage('sync_queue', item);

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');

      const queueItem = {
        id: item.id || `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: item.type, // 'CREATE_VISIT', 'SHARE_LOCATION', 'CREATE_PLAN', etc.
        endpoint: item.endpoint, // '/visits', '/visits/12/share-location'
        method: item.method || 'POST',
        payload: item.payload || {},
        tempId: item.tempId || null,
        status: 'pending',
        timestamp: Date.now(),
        retries: 0,
        metadata: item.metadata || {},
      };

      const req = store.put(queueItem);
      req.onsuccess = () => resolve(queueItem);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('خطأ أثناء إضافة عملية لطابور المزامنة:', err);
    fallbackSaveToLocalStorage('sync_queue', item);
  }
}

export async function getSyncQueue() {
  try {
    const db = await openDatabase();
    if (!db) return fallbackGetFromLocalStorage('sync_queue');

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result || [];
        // فرز العناصر بالترتيب الزمني (الأقدم أولاً - FIFO)
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('خطأ أثناء جلب طابور المزامنة:', err);
    return fallbackGetFromLocalStorage('sync_queue');
  }
}

export async function removeSyncQueueItem(id) {
  try {
    const db = await openDatabase();
    if (!db) return fallbackRemoveFromLocalStorage('sync_queue', id);

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('خطأ أثناء حذف عنصر من طابور المزامنة:', err);
    fallbackRemoveFromLocalStorage('sync_queue', id);
  }
}

export async function getSyncQueueCount() {
  try {
    const db = await openDatabase();
    if (!db) return fallbackGetFromLocalStorage('sync_queue').length;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

// ─── دوال التعامل مع كاش البيانات المحلي (Offline Cache) ─────────────────

export async function setCachedData(key, data) {
  try {
    const db = await openDatabase();
    if (!db) {
      localStorage.setItem(`cached_${key}`, JSON.stringify(data));
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_cache', 'readwrite');
      const store = tx.objectStore('offline_cache');
      const req = store.put({ key, data, updatedAt: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn(`فشل تخزين كاش ${key}:`, err);
    try {
      localStorage.setItem(`cached_${key}`, JSON.stringify(data));
    } catch (_) {}
  }
}

export async function getCachedData(key) {
  try {
    const db = await openDatabase();
    if (!db) {
      const item = localStorage.getItem(`cached_${key}`);
      return item ? JSON.parse(item) : null;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_cache', 'readonly');
      const store = tx.objectStore('offline_cache');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? req.result.data : null);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn(`فشل قراءة كاش ${key}:`, err);
    try {
      const item = localStorage.getItem(`cached_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (_) {
      return null;
    }
  }
}

// إضافة عنصر جديد للكاش المحلي مباشرة (مثل زيارة جديدة أضيفت أوفلاين)
export async function addOrPrependCachedItem(key, item, atBeginning = true) {
  try {
    const currentList = (await getCachedData(key)) || [];
    const updatedList = atBeginning ? [item, ...currentList] : [...currentList, item];
    await setCachedData(key, updatedList);
    return updatedList;
  } catch (err) {
    console.error(`خطأ في إضافة عنصر لكاش ${key}:`, err);
    return null;
  }
}

// تحديث عنصر داخل الكاش المحلي (مثل تعديل زيارة أو تسجيل موقعها أوفلاين)
export async function updateCachedItemInList(key, idKey, idValue, newFields) {
  try {
    const currentList = (await getCachedData(key)) || [];
    const index = currentList.findIndex((item) => String(item[idKey]) === String(idValue));
    if (index !== -1) {
      currentList[index] = { ...currentList[index], ...newFields };
      await setCachedData(key, currentList);
    }
    return currentList;
  } catch (err) {
    console.error(`خطأ في تحديث عنصر بكاش ${key}:`, err);
    return null;
  }
}

// ─── بدائل احتياطية في حالة عدم توفر IndexedDB (LocalStorage Fallback) ───

function fallbackSaveToLocalStorage(storageName, item) {
  try {
    const list = JSON.parse(localStorage.getItem(storageName) || '[]');
    const queueItem = {
      id: item.id || `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...item,
      timestamp: Date.now(),
    };
    list.push(queueItem);
    localStorage.setItem(storageName, JSON.stringify(list));
    return queueItem;
  } catch (e) {
    console.error('LocalStorage fallback error:', e);
  }
}

function fallbackGetFromLocalStorage(storageName) {
  try {
    return JSON.parse(localStorage.getItem(storageName) || '[]');
  } catch {
    return [];
  }
}

function fallbackRemoveFromLocalStorage(storageName, id) {
  try {
    const list = JSON.parse(localStorage.getItem(storageName) || '[]');
    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(storageName, JSON.stringify(filtered));
  } catch (e) {
    console.error('LocalStorage fallback remove error:', e);
  }
}
