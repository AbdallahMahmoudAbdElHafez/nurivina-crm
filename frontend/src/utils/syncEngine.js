// src/utils/syncEngine.js
// محرك المزامنة التلقائي للبيانات المحفوظة محلياً عند عودة الإنترنت

import api from '../api/apiClient';
import {
  getSyncQueue,
  removeSyncQueueItem,
  getSyncQueueCount,
  getCachedData,
  setCachedData,
} from './indexedDB';

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.listeners = new Set();
    this.tempIdMap = {}; // خريطة مطابقة المعرفات المؤقتة بالمعرفات الحقيقية للسيرفر
    this.lastSyncTime = null;
    this.lastError = null;

    // استعادة خريطة المعرفات المؤقتة من التخزين إذا وجدت
    try {
      const savedMap = localStorage.getItem('crm_temp_id_map');
      if (savedMap) this.tempIdMap = JSON.parse(savedMap);
    } catch (_) {}

    this.initListeners();
  }

  // تسجيل مستمعين لتحديثات حالة المزامنة
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(eventData) {
    for (const listener of this.listeners) {
      try {
        listener(eventData);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    }
  }

  initListeners() {
    // الاستماع لعودة الإنترنت تلقائياً
    window.addEventListener('online', () => {
      console.info('🌐 عاد الاتصال بالإنترنت — بدء المزامنة التلقائية...');
      this.syncAll();
    });

    // فحص دوري كل 30 ثانية في حال توفر الإنترنت ووجود عمليات معلقة
    setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        getSyncQueueCount().then((count) => {
          if (count > 0) {
            this.syncAll();
          }
        });
      }
    }, 30000);
  }

  saveTempIdMapping(tempId, realId) {
    if (!tempId || !realId) return;
    this.tempIdMap[String(tempId)] = String(realId);
    try {
      localStorage.setItem('crm_temp_id_map', JSON.stringify(this.tempIdMap));
    } catch (_) {}
  }

  resolveId(id) {
    if (!id) return id;
    return this.tempIdMap[String(id)] || id;
  }

  // تنفيذ مزامنة كاملة لجميع العمليات المعلقة في طابور المزامنة
  async syncAll() {
    if (this.isSyncing) {
      console.info('⏳ المزامنة قيد التشغيل بالفعل...');
      return;
    }

    if (!navigator.onLine) {
      console.info('⚠️ لا يوجد اتصال بالإنترنت حالياً.');
      return;
    }

    const queue = await getSyncQueue();
    if (queue.length === 0) {
      this.notify({ type: 'IDLE', pendingCount: 0 });
      return;
    }

    this.isSyncing = true;
    this.notify({ type: 'SYNC_STARTED', total: queue.length });

    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        let endpoint = item.endpoint;
        let payload = { ...item.payload };

        // 1. فحص الـ endpoint وتحديث المعرفات المؤقتة إذا كانت مطابقة لمعرف حقيقي
        for (const [tempId, realId] of Object.entries(this.tempIdMap)) {
          if (endpoint.includes(tempId)) {
            endpoint = endpoint.replace(tempId, realId);
          }
        }

        // 2. فحص الحقول في الـ payload واستبدال أي معرف مؤقت
        if (payload.visit_id && this.tempIdMap[payload.visit_id]) {
          payload.visit_id = this.tempIdMap[payload.visit_id];
        }
        if (payload.doctor_id && this.tempIdMap[payload.doctor_id]) {
          payload.doctor_id = this.tempIdMap[payload.doctor_id];
        }
        if (payload.clinic_id && this.tempIdMap[payload.clinic_id]) {
          payload.clinic_id = this.tempIdMap[payload.clinic_id];
        }

        // 3. إرسال الطلب إلى السيرفر
        const response = await api({
          url: endpoint,
          method: item.method,
          data: payload,
        });

        // 4. استخراج المعرف الجديد وتحديث الـ Mapping والكاش المحلي
        if (item.type === 'CREATE_VISIT' && item.tempId) {
          const createdVisit = response.data?.visit || response.data;
          const realVisitId = createdVisit?.visit_id || createdVisit?.id;
          if (realVisitId) {
            this.saveTempIdMapping(item.tempId, realVisitId);
            await this.updateVisitInLocalCache(item.tempId, realVisitId, createdVisit);
          }
        } else if (item.type === 'CREATE_PLAN' && item.tempId) {
          const realPlanId = response.data?.id;
          if (realPlanId) {
            this.saveTempIdMapping(item.tempId, realPlanId);
          }
        } else if (item.type === 'CREATE_DOCTOR' && item.tempId) {
          const realDocId = response.data?.id;
          if (realDocId) {
            this.saveTempIdMapping(item.tempId, realDocId);
          }
        } else if (item.type === 'CREATE_CLINIC' && item.tempId) {
          const realClinicId = response.data?.id;
          if (realClinicId) {
            this.saveTempIdMapping(item.tempId, realClinicId);
          }
        }

        // 5. حذف العملية من طابور المزامنة بعد نجاحها
        await removeSyncQueueItem(item.id);
        successCount++;
      } catch (err) {
        console.warn('فشل مزامنة العملية المعلقة:', item, err.message);
        failCount++;
        // إذا كان الخطأ متعلقاً بالاتصال، نوقف الدورة ونحاول لاحقاً
        if (!navigator.onLine || err.code === 'ERR_NETWORK' || !err.response) {
          break;
        }
        // في حالة وجود خطأ دائم من السيرفر (كبيانات غير صالحة 400)، نرفع عدد المحاولات
        item.retries = (item.retries || 0) + 1;
        if (item.retries >= 5) {
          console.error('تجاوزت العملية الحد الأقصى للمحاولات وتم إزالتها:', item);
          await removeSyncQueueItem(item.id);
        }
      }
    }

    this.isSyncing = false;
    this.lastSyncTime = Date.now();

    const remainingCount = await getSyncQueueCount();

    this.notify({
      type: 'SYNC_FINISHED',
      syncedCount: successCount,
      failedCount: failCount,
      pendingCount: remainingCount,
      timestamp: this.lastSyncTime,
    });

    if (successCount > 0) {
      console.info(`✅ تمت مزامنة ${successCount} عملية بنجاح مع السيرفر الرئيسي`);
      // إشعار التطبيق لتحديث بيانات الشاشات
      window.dispatchEvent(
        new CustomEvent('crm_data_synced', {
          detail: { successCount, timestamp: this.lastSyncTime },
        })
      );
    }

    return { successCount, failCount, remainingCount };
  }

  // تحديث الزيارة في الكاش المحلي باستبدال المعرف المؤقت بالمعرف الدائم
  async updateVisitInLocalCache(tempId, realId, serverVisit) {
    try {
      const visits = (await getCachedData('visits')) || [];
      const updatedVisits = visits.map((v) => {
        if (String(v.visit_id) === String(tempId)) {
          return {
            ...v,
            ...(serverVisit || {}),
            visit_id: realId,
            is_pending_sync: false,
          };
        }
        return v;
      });
      await setCachedData('visits', updatedVisits);
    } catch (e) {
      console.warn('فشل تحديث كاش الزيارة المحلي:', e);
    }
  }
}

// إنشاء نسخة موحدة (Singleton)
export const syncEngine = new SyncEngine();
export default syncEngine;
