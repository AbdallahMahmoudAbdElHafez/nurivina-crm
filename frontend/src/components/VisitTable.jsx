import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialReactTable } from 'material-react-table';
import { fetchVisits, addVisit, updateVisitLocally } from '../features/visits/visitsSlice';
import api from '../api/apiClient';
import { fetchDoctors } from '../features/doctors/doctorsSlice';
import { fetchClinics } from '../features/clinics/clinicsSlice';
import { savePendingLocation } from '../hooks/useOfflineSync';

// ---- مكوّن زر مشاركة الموقع لكل صف ----
function ShareLocationBtn({ visitId, onSuccess }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'sent' | 'saved' | 'error'

  const handleShare = () => {
    if (!navigator.geolocation) {
      alert('متصفحك لا يدعم تحديد الموقع');
      return;
    }

    setLoading(true);
    setStatus(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const sharedAt = new Date().toISOString();

        if (navigator.onLine) {
          // متصل: إرسال فوري
          try {
            await api.post(`/visits/${visitId}/share-location`, { lat, lng, sharedAt });
            setStatus('sent');
            dispatch(
              updateVisitLocally({
                visitId,
                fields: { shared_lat: lat, shared_lng: lng, shared_at: sharedAt },
              })
            );
            if (onSuccess) onSuccess();
          } catch (err) {
            console.error('خطأ في إرسال الموقع، الحفظ محلياً:', err);
            await savePendingLocation(visitId, lat, lng, sharedAt);
            dispatch(
              updateVisitLocally({
                visitId,
                fields: { shared_lat: lat, shared_lng: lng, shared_at: sharedAt },
              })
            );
            setStatus('saved');
          }
        } else {
          // غير متصل: حفظ محلي وإدراج في طابور المزامنة
          await savePendingLocation(visitId, lat, lng, sharedAt);
          dispatch(
            updateVisitLocally({
              visitId,
              fields: { shared_lat: lat, shared_lng: lng, shared_at: sharedAt },
            })
          );
          setStatus('saved');
        }

        setLoading(false);
      },
      (error) => {
        console.error('خطأ في تحديد الموقع:', error.message);
        alert('تعذّر الحصول على موقعك. تأكد من منح إذن الوصول للموقع.');
        setLoading(false);
        setStatus('error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '6px',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
    ...(status === 'sent'
      ? { background: '#22c55e', color: '#fff' }
      : status === 'saved'
      ? { background: '#f59e0b', color: '#fff' }
      : status === 'error'
      ? { background: '#ef4444', color: '#fff' }
      : { background: '#2563eb', color: '#fff' }),
  };

  const label = loading
    ? '⏳ جارٍ...'
    : status === 'sent'
    ? '✅ أُرسل'
    : status === 'saved'
    ? '💾 محفوظ أوفلاين'
    : status === 'error'
    ? '❌ فشل'
    : '📍 شارك موقعك';

  return (
    <button style={btnStyle} onClick={handleShare} disabled={loading} title="شارك موقعك الآن">
      {label}
    </button>
  );
}

// ---- مكوّن عرض الموقع المحفوظ في صف ----
function LocationCell({ lat, lng, sharedAt }) {
  if (!lat || !lng) return <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>;

  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const timeStr = sharedAt
    ? new Date(sharedAt).toLocaleString('ar-EG', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#2563eb', fontSize: '12px', textDecoration: 'underline' }}
      >
        🗺 عرض على الخريطة
      </a>
      {timeStr && <span style={{ color: '#6b7280', fontSize: '11px' }}>{timeStr}</span>}
    </div>
  );
}

// ---- المكوّن الرئيسي ----
export default function VisitTable() {
  const dispatch = useDispatch();
  const { list, status } = useSelector((s) => s.visits);
  const doctors = useSelector((s) => s.doctors.list);
  const clinics = useSelector((s) => s.clinics.list);

  const [doctorId, setDoctorId] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dispatch(fetchVisits());
    dispatch(fetchDoctors());
    dispatch(fetchClinics());

    // الاستماع لحدث اكتمال المزامنة التلقائية لإعادة تحديث الجدول
    const handleDataSynced = () => {
      dispatch(fetchVisits());
    };
    window.addEventListener('crm_data_synced', handleDataSynced);
    return () => window.removeEventListener('crm_data_synced', handleDataSynced);
  }, [dispatch]);

  const handleAddVisit = async () => {
    if (!doctorId || !clinicId || !weekNumber) {
      alert('يرجى اختيار الطبيب والعيادة وإدخال رقم الأسبوع');
      return;
    }
    const visitData = {
      doctor_id: doctorId,
      clinic_id: clinicId,
      week_number: weekNumber,
      visit_date: new Date().toISOString().split('T')[0],
      notes,
    };
    await dispatch(addVisit(visitData));
    setDoctorId('');
    setClinicId('');
    setWeekNumber('');
    setNotes('');
  };

  const columns = [
    {
      accessorKey: 'visit_id',
      header: 'ID',
      size: 70,
      Cell: ({ row }) => {
        const id = String(row.original.visit_id);
        const isTemp = id.startsWith('temp_');
        return isTemp ? (
          <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>مؤقت</span>
        ) : (
          <span>{id}</span>
        );
      },
    },
    {
      id: 'sync_status',
      header: 'حالة المزامنة',
      size: 110,
      Cell: ({ row }) => {
        const isPending =
          row.original.is_pending_sync || String(row.original.visit_id).startsWith('temp_');
        return isPending ? (
          <span className="badge-status badge-pending">⏳ أوفلاين</span>
        ) : (
          <span className="badge-status badge-synced">✅ متزامن</span>
        );
      },
    },
    { accessorKey: 'user.full_name', header: 'المندوب', size: 120 },
    { accessorKey: 'doctor.name', header: 'الطبيب', size: 120 },
    { accessorKey: 'clinic.clinic_name', header: 'العيادة', size: 120 },
    { accessorKey: 'visit_date', header: 'تاريخ الزيارة', size: 110 },
    { accessorKey: 'week_number', header: 'الأسبوع', size: 70 },
    { accessorKey: 'notes', header: 'ملاحظات', size: 140 },
    {
      id: 'location',
      header: 'الموقع المشارَك',
      size: 150,
      Cell: ({ row }) => (
        <LocationCell
          lat={row.original.shared_lat}
          lng={row.original.shared_lng}
          sharedAt={row.original.shared_at}
        />
      ),
    },
    {
      id: 'shareLocation',
      header: 'شارك الموقع',
      size: 140,
      enableSorting: false,
      enableColumnFilter: false,
      Cell: ({ row }) => (
        <ShareLocationBtn
          visitId={row.original.visit_id}
          onSuccess={() => dispatch(fetchVisits())}
        />
      ),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
          📅 الزيارات والمواقع
        </h2>
      </div>

      {/* نموذج إضافة زيارة - متجاوب بالكامل مع الهواتف */}
      <div
        style={{
          background: '#ffffff',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#334155' }}>
          تسجيل زيارة جديدة (يعمل أوفلاين وأونلاين)
        </div>

        <div className="responsive-form-row">
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '14px',
            }}
          >
            <option value="">اختر الطبيب</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>

          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '14px',
            }}
          >
            <option value="">اختر العيادة</option>
            {clinics.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.clinic_name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="رقم الأسبوع"
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
            }}
          />

          <input
            type="text"
            placeholder="ملاحظات الزيارة"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
            }}
          />

          <button
            onClick={handleAddVisit}
            style={{
              padding: '10px 18px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.2s',
            }}
          >
            + إضافة زيارة
          </button>
        </div>
      </div>

      {/* الجدول مغلّف بحاوية تمرير أفقي سلس للموبايل */}
      <div className="table-responsive-container">
        <MaterialReactTable
          columns={columns}
          data={list || []}
          state={{ isLoading: status === 'loading' }}
          enableRowActions={false}
          initialState={{ density: 'compact' }}
          muiTablePaperProps={{
            elevation: 0,
            sx: { borderRadius: '12px' },
          }}
        />
      </div>
    </div>
  );
}
