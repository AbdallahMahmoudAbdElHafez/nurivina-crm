import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPendingApprovals,
  approveVisitAction,
  rejectVisitAction,
} from '../features/visits/visitsSlice';

// ─── شارة نوع الطلب ─────────────────────────────────────────────────────────
function ApprovalTypeBadge({ type, deviation }) {
  const config = {
    new_doctor: { label: '🩺 دكتور جديد', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    new_clinic: { label: '🏥 عيادة جديدة', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    location_deviation: {
      label: `📍 انحراف موقع (${deviation || '?'}م)`,
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fde68a',
    },
  };
  const c = config[type] || { label: type, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: 700,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </span>
  );
}

// ─── دايلوج الرفض مع سبب ────────────────────────────────────────────────────
function RejectDialog({ isOpen, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '440px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#dc2626', fontWeight: 700 }}>
          ❌ رفض الزيارة
        </h3>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
          سبب الرفض (اختياري):
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="اكتب سبب الرفض..."
          rows={3}
          style={{
            width: '100%',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '10px 12px',
            fontSize: '13px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              color: '#475569',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm(reason);
              setReason('');
            }}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ جاري الرفض...' : '✖ تأكيد الرفض'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي ────────────────────────────────────────────────────────
export default function PendingApprovalsTable() {
  const dispatch = useDispatch();
  const { pendingApprovals, pendingStatus } = useSelector((s) => s.visits);

  const [actionLoading, setActionLoading] = useState(null); // visit_id being acted on
  const [rejectTarget, setRejectTarget] = useState(null); // visit to reject

  useEffect(() => {
    dispatch(fetchPendingApprovals());
  }, [dispatch]);

  const handleApprove = async (visitId) => {
    setActionLoading(visitId);
    try {
      await dispatch(approveVisitAction(visitId)).unwrap();
    } catch (err) {
      alert('حدث خطأ أثناء اعتماد الزيارة: ' + (err?.message || err));
    }
    setActionLoading(null);
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.visit_id);
    try {
      await dispatch(
        rejectVisitAction({
          visitId: rejectTarget.visit_id,
          rejection_reason: reason,
        })
      ).unwrap();
    } catch (err) {
      alert('حدث خطأ أثناء رفض الزيارة: ' + (err?.message || err));
    }
    setActionLoading(null);
    setRejectTarget(null);
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    padding: '16px 18px',
    marginBottom: '12px',
    transition: 'box-shadow 0.2s',
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '2px',
  };

  const valueStyle = {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1e293b',
  };

  return (
    <div style={{ width: '100%' }}>
      <RejectDialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={actionLoading === rejectTarget?.visit_id}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          ⏳ الزيارات المعلّقة بانتظار الاعتماد
        </h2>
        <button
          onClick={() => dispatch(fetchPendingApprovals())}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '12px',
            color: '#475569',
          }}
        >
          🔄 تحديث
        </button>
      </div>

      {pendingStatus === 'loading' && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }}>
          ⏳ جاري تحميل الطلبات...
        </div>
      )}

      {pendingStatus === 'succeeded' && pendingApprovals.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8',
            fontSize: '15px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px dashed #e2e8f0',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '16px' }}>
            لا توجد زيارات معلّقة
          </div>
          <div style={{ marginTop: '4px', fontSize: '13px' }}>
            جميع الزيارات تم اعتمادها أو رفضها
          </div>
        </div>
      )}

      {pendingApprovals.map((visit) => (
        <div key={visit.visit_id} style={cardStyle}>
          {/* الصف الأول: المندوب + نوع الطلب */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#eff6ff',
                  fontSize: '16px',
                }}
              >
                👤
              </span>
              <div>
                <div style={valueStyle}>{visit.user?.full_name || '—'}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>#{visit.visit_id}</div>
              </div>
            </div>
            <ApprovalTypeBadge type={visit.approval_type} deviation={visit.deviation_meters} />
          </div>

          {/* بيانات الزيارة */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <div>
              <div style={labelStyle}>🩺 الطبيب</div>
              <div style={valueStyle}>{visit.doctor?.name || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>🏥 العيادة</div>
              <div style={valueStyle}>{visit.clinic?.clinic_name || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>📅 التاريخ</div>
              <div style={valueStyle}>{visit.visit_date || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>📆 الأسبوع</div>
              <div style={valueStyle}>{visit.week_number || '—'}</div>
            </div>
          </div>

          {/* ملاحظات */}
          {visit.notes && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#475569',
                marginBottom: '14px',
                border: '1px solid #f1f5f9',
              }}
            >
              📝 {visit.notes}
            </div>
          )}

          {/* الموقع المشارك */}
          {visit.shared_lat && visit.shared_lng && (
            <div
              style={{
                background: '#f0fdf4',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#166534',
                marginBottom: '14px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📍 الموقع:
              <a
                href={`https://www.google.com/maps?q=${visit.shared_lat},${visit.shared_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600 }}
              >
                عرض على الخريطة
              </a>
              {visit.deviation_meters && (
                <span style={{ color: '#92400e', fontWeight: 700 }}>
                  (انحراف: {visit.deviation_meters}م)
                </span>
              )}
            </div>
          )}

          {/* أزرار الاعتماد والرفض */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setRejectTarget(visit)}
              disabled={actionLoading === visit.visit_id}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                background: '#fef2f2',
                color: '#dc2626',
                cursor: actionLoading === visit.visit_id ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                transition: 'all 0.15s',
              }}
            >
              ✖ رفض
            </button>
            <button
              onClick={() => handleApprove(visit.visit_id)}
              disabled={actionLoading === visit.visit_id}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                cursor: actionLoading === visit.visit_id ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                opacity: actionLoading === visit.visit_id ? 0.7 : 1,
                transition: 'all 0.15s',
              }}
            >
              {actionLoading === visit.visit_id ? '⏳ جاري...' : '✅ اعتماد'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
