import React, { useState } from 'react';
import api from '../api/apiClient';
import { savePendingCompleteVisit } from '../hooks/useOfflineSync';

export default function CompleteVisitModal({
  isOpen,
  onClose,
  visit,
  onSuccess,
}) {
  const [outcome, setOutcome] = useState(''); // 'completed' | 'not_completed'
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // استرجاع الملاحظات السابقة إن وُجدت عند فتح الدايلوج
  React.useEffect(() => {
    if (isOpen && visit) {
      setNotes(visit.notes || '');
      setOutcome('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  // التقاط موقع الخروج GPS وحفظ الزيارة
  const handleAction = async (chosenOutcome) => {
    if (!navigator.geolocation) {
      alert('متصفحك لا يدعم تحديد الموقع GPS');
      return;
    }

    setOutcome(chosenOutcome);
    setIsSubmitting(true);
    setErrorMsg('');

    const getPositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 120000,
    };

    const processFinish = async (pos) => {
      const exitLat = pos.coords.latitude;
      const exitLng = pos.coords.longitude;
      const exitAt = pos.timestamp ? new Date(pos.timestamp).toISOString() : new Date().toISOString();

      const visitId = visit.visit_id;
      const isCompleted = chosenOutcome === 'completed';

      if (navigator.onLine) {
        try {
          await api.post(`/visits/${visitId}/complete`, {
            outcome: chosenOutcome,
            notes,
            exit_lat: exitLat,
            exit_lng: exitLng,
            exit_at: exitAt,
          });

          if (onSuccess) onSuccess({ visitId, outcome: chosenOutcome, notes, exitLat, exitLng, exitAt });
          onClose();
        } catch (err) {
          console.warn('خطأ في الاتصال بالسيرفر، جاري الحفظ محلياً أوفلاين:', err);
          await savePendingCompleteVisit(visitId, chosenOutcome, notes, exitLat, exitLng, exitAt);
          if (onSuccess) onSuccess({ visitId, outcome: chosenOutcome, notes, exitLat, exitLng, exitAt });
          onClose();
        }
      } else {
        await savePendingCompleteVisit(visitId, chosenOutcome, notes, exitLat, exitLng, exitAt);
        if (onSuccess) onSuccess({ visitId, outcome: chosenOutcome, notes, exitLat, exitLng, exitAt });
        onClose();
      }

      setIsSubmitting(false);
    };

    const onPosError = (err) => {
      console.warn('High accuracy capture failed, attempting fallback...', err);
      navigator.geolocation.getCurrentPosition(
        processFinish,
        (fallbackErr) => {
          console.error('Location capture error:', fallbackErr);
          setIsSubmitting(false);
          let msg = 'تعذر الحصول على موقع الخروج.';
          if (fallbackErr.code === 1) {
            msg = 'تم رفض إذن الوصول للموقع. يرجى تفعيل إذن الموقع للمتصفح.';
          } else if (fallbackErr.code === 2) {
            msg = 'إشارة الـ GPS غير متوفرة. يرجى التأكد من تشغيل الـ GPS.';
          } else if (fallbackErr.code === 3) {
            msg = 'استغرق تحديد الموقع وقتاً طويلاً. يرجى المحاولة مجدداً.';
          }
          setErrorMsg(msg);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
      );
    };

    navigator.geolocation.getCurrentPosition(processFinish, onPosError, getPositionOptions);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* رأس المودال */}
        <div
          style={{
            padding: '16px 20px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>
              إنهاء وتوثيق الزيارة (تسجيل الخروج)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* محتوى المودال */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* كارت ملخص تفاصيل الزيارة */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🩺 الطبيب: <b>{visit.doctor?.name || '—'}</b></span>
              <span>🏥 العيادة: <b>{visit.clinic?.clinic_name || '—'}</b></span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              📍 موقع الدخول: {visit.shared_lat ? '✅ تم التقاطه عند بدء الزيارة' : '⚠️ لم يتم التقاطه'}
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* خانة الملاحظات */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
              📝 ملاحظات ما بعد الزيارة / تقرير المندوب:
            </label>
            <textarea
              placeholder="اكتب ملاحظاتك عن نتيجة المقابلة مع الطبيب..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13.5px',
                fontFamily: 'Cairo, sans-serif',
                resize: 'vertical',
                minHeight: '85px',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          >
            💡 عند الضغط على أي من الزرين أدناه، سيتم <b>التقاط موقعك الجغرافي بالـ GPS الآن (موقع الخروج)</b> وتوثيق وقت الانصراف بدقة.
          </div>

          {/* أزرار الإجراءين */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '4px',
            }}
          >
            {/* زر تمت الزيارة */}
            <button
              type="button"
              onClick={() => handleAction('completed')}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting && outcome === 'completed' ? '#86efac' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 14px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{isSubmitting && outcome === 'completed' ? '⏳' : '✅'}</span>
                <span>{isSubmitting && outcome === 'completed' ? 'جاري تحديد موقع الخروج...' : 'تمت الزيارة'}</span>
              </div>
              <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 500 }}>
                (احتساب الزيارة + شير خروج)
              </span>
            </button>

            {/* زر لم تتم الزيارة */}
            <button
              type="button"
              onClick={() => handleAction('not_completed')}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting && outcome === 'not_completed' ? '#fca5a5' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 14px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{isSubmitting && outcome === 'not_completed' ? '⏳' : '❌'}</span>
                <span>{isSubmitting && outcome === 'not_completed' ? 'جاري تحديد موقع الخروج...' : 'لم تتم الزيارة'}</span>
              </div>
              <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 500 }}>
                (عدم احتسابها + شير خروج)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
