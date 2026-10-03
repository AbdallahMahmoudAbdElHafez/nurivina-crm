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

    // قد يعود الاتصال أثناء وجود التطبيق في الخلفية دون وصول حدث online.
    window.addEventListener('focus', () => this.syncAll());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.syncAll();
    });
    window.addEventListener('crm_queue_updated', () => this.syncAll());

    // فحص دوري كل 30 ثانية في حال توفر الإنترنت ووجود عمليات معلقة
    setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncAll();
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

    // حجز دورة المزامنة قبل قراءة الطابور حتى لا تبدأ دورتان معاً.
    this.isSyncing = true;
    this.lastError = null;
    try {
      return await this.syncQueue();
    } catch (err) {
      this.lastError = this.getErrorInfo(err);
      const remainingCount = await getSyncQueueCount().catch(() => 0);
      this.notify({
        type: 'SYNC_FINISHED',
        syncedCount: 0,
        failedCount: 1,
        pendingCount: remainingCount,
        error: this.lastError,
      });
      return { successCount: 0, failCount: 1, remainingCount };
    } finally {
      this.isSyncing = false;
    }
  }

  getErrorInfo(err) {
    const status = err.response?.status;
    return {
      status,
      message: status === 401
        ? 'انتهت جلسة الدخول. سجّل الدخول مجدداً بنفس الحساب لإرسال البيانات المحفوظة.'
        : status === 403
        ? 'السيرفر رفض العملية بسبب الصلاحيات. البيانات ما زالت محفوظة محلياً.'
        : err.response?.data?.message || err.message || 'تعذر إرسال البيانات. ستتم إعادة المحاولة تلقائياً.',
    };
  }

  async syncQueue() {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      this.notify({ type: 'IDLE', pendingCount: 0 });
      return;
    }

    this.notify({ type: 'SYNC_STARTED', total: queue.length });

    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        const endpoint = item.endpoint.split('/').map((part) => this.resolveId(part)).join('/');
        const payload = { ...item.payload };
        const idFields = ['visit_id', 'doctor_id', 'clinic_id', 'city_id'];

        // إرسال الأرقام الحقيقية بعد نجاح إنشاء البيانات المرتبطة.
        for (const field of idFields) {
          if (payload[field] != null) payload[field] = this.resolveId(payload[field]);
        }

        // لا نرسل زيارة أو خطة قبل نجاح إنشاء الطبيب/العيادة التي تعتمد عليها.
        if (endpoint.split('/').some((part) => part.startsWith('temp_')) ||
            idFields.some((field) => String(payload[field]).startsWith('temp_'))) {
          failCount++;
          if (!this.lastError) {
            this.lastError = { message: 'توجد بيانات تنتظر مزامنة السجلات المرتبطة بها. ستتم إعادة المحاولة تلقائياً.' };
          }
          continue;
        }

        // 3. إرسال الطلب إلى السيرفر
        const response = await api({
          url: endpoint,
          method: item.method,
          data: payload,
        });

        // 4. استخراج المعرف الجديد وتحديث الـ Mapping والكاش المحلي
        if (item.type.startsWith('CREATE_') && item.tempId) {
          const createdItem = response.data?.visit || response.data;
          const realId = createdItem?.visit_id || createdItem?.id;
          if (!realId) {
            throw new Error('لم يؤكد السيرفر رقم السجل الجديد. العملية ما زالت محفوظة لإعادة المحاولة.');
          }
          this.saveTempIdMapping(item.tempId, realId);
          if (item.type === 'CREATE_VISIT') {
            await this.updateVisitInLocalCache(item.tempId, realId, createdItem);
          }
        }

        // 5. حذف العملية من طابور المزامنة بعد نجاحها
        await removeSyncQueueItem(item.id);
        successCount++;
      } catch (err) {
        console.warn('فشل مزامنة العملية المعلقة:', item, err.message);
        failCount++;
        if (!this.lastError) this.lastError = this.getErrorInfo(err);
        // إذا كان الخطأ متعلقاً بالاتصال، نوقف الدورة ونحاول لاحقاً
        if (!navigator.onLine || err.code === 'ERR_NETWORK' || !err.response || err.response.status === 401) {
          break;
        }
        // تظل العملية في الطابور حتى يؤكد السيرفر نجاحها.
      }
    }

    this.lastSyncTime = Date.now();

    const remainingCount = await getSyncQueueCount();

    this.notify({
      type: 'SYNC_FINISHED',
      syncedCount: successCount,
      failedCount: failCount,
      pendingCount: remainingCount,
      timestamp: this.lastSyncTime,
      error: this.lastError,
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
