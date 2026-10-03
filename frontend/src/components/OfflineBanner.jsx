// src/components/OfflineBanner.jsx
// شريط تنبيه متجاوب ذكي لحالة الاتصال والمزامنة بدون إنترنت

import React from 'react';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncNow, lastSyncResult } = useNetworkStatus();

  // إذا كنا متصلين ولا توجد أي عمليات معلقة، لا داعي لعرض الشريط
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      style={{
        padding: '10px 16px',
        marginBottom: '16px',
        borderRadius: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        ...(!isOnline
          ? {
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#92400e',
            }
          : {
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              color: '#1e40af',
            }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>
          {!isOnline ? '📡' : isSyncing ? '⏳' : '💾'}
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>
            {!isOnline
              ? 'وضع العمل بدون إنترنت (Offline Mode)'
              : isSyncing
              ? 'جارٍ المزامنة مع قاعدة البيانات...'
              : 'بيانات غير متزامنة بانتظار الإرسال'}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            {!isOnline
              ? 'يمكنك إدخال البيانات والزيارات بشكل طبيعي. يتم حفظ كل شيء محلياً وسيتم إرسالها تلقائياً بمجرد عودة الإنترنت.'
              : isSyncing
              ? `يتم الآن إرسال ${pendingCount} عملية محفوظة إلى السيرفر الرئيسي...`
              : `لديك ${pendingCount} عملية تم حفظها محلياً وجاهزة للإرسال إلى قاعدة البيانات.`}
          </div>
          {isOnline && !isSyncing && lastSyncResult?.error && (
            <div role="alert" style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>
              {lastSyncResult.error.message}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {pendingCount > 0 && (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: !isOnline ? '#fef3c7' : '#dbeafe',
              color: !isOnline ? '#b45309' : '#1d4ed8',
            }}
          >
            {pendingCount} عملية معلقة
          </span>
        )}

        {isOnline && pendingCount > 0 && (
          <button
            onClick={syncNow}
            disabled={isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.7 : 1,
              transition: 'background-color 0.2s',
            }}
          >
            {isSyncing ? '⏳ جارٍ المزامنة...' : '🚀 مزامنة الآن'}
          </button>
        )}
      </div>
    </div>
  );
}
