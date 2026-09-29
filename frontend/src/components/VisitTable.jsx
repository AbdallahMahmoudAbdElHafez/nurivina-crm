import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialReactTable } from 'material-react-table';
import { fetchVisits, addVisit, updateVisitLocally } from '../features/visits/visitsSlice';
import api from '../api/apiClient';
import { fetchDoctors, addDoctor } from '../features/doctors/doctorsSlice';
import { fetchClinics, addClinic } from '../features/clinics/clinicsSlice';
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

  // حالات إضافة دكتور أو عيادة جديدة داخل نموذج الزيارة
  const [isAddingNewDoctor, setIsAddingNewDoctor] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [isAddingNewClinic, setIsAddingNewClinic] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchVisits());
    dispatch(fetchDoctors());
    dispatch(fetchClinics());

    const handleDataSynced = () => {
      dispatch(fetchVisits());
      dispatch(fetchDoctors());
      dispatch(fetchClinics());
    };
    window.addEventListener('crm_data_synced', handleDataSynced);
    return () => window.removeEventListener('crm_data_synced', handleDataSynced);
  }, [dispatch]);

  // حساب العيادات المرتبطة بالطبيب المختار من جدول الزيارات السابقة
  const { associatedClinics, otherClinics } = useMemo(() => {
    if (!doctorId || isAddingNewDoctor || doctorId === '__NEW__') {
      return { associatedClinics: [], otherClinics: clinics };
    }

    // استخراج معرّفات العيادات التي زارها المندوب مع هذا الطبيب سابقاً
    const doctorVisits = (list || []).filter(
      (v) => String(v.doctor_id || v.doctor?.id) === String(doctorId)
    );

    const associatedIds = new Set(
      doctorVisits.map((v) => String(v.clinic_id || v.clinic?.id)).filter(Boolean)
    );

    const associated = [];
    const others = [];

    clinics.forEach((c) => {
      if (associatedIds.has(String(c.id))) {
        associated.push(c);
      } else {
        others.push(c);
      }
    });

    return { associatedClinics: associated, otherClinics: others };
  }, [doctorId, isAddingNewDoctor, list, clinics]);

  // عند تغيير الطبيب
  const handleDoctorChange = (val) => {
    if (val === '__NEW__') {
      setIsAddingNewDoctor(true);
      setDoctorId('');
      setClinicId('');
    } else {
      setIsAddingNewDoctor(false);
      setDoctorId(val);
      setClinicId(''); // إعادة تعيين العيادة ليختار المندوب من العيادات المرتبطة أو يضيف جديدة
    }
  };

  // عند تغيير العيادة
  const handleClinicChange = (val) => {
    if (val === '__NEW__') {
      setIsAddingNewClinic(true);
      setClinicId('');
    } else {
      setIsAddingNewClinic(false);
      setClinicId(val);
    }
  };

  // معالجة تسجيل الزيارة وحفظ الطبيب/العيادة إن وُجدا
  const handleAddVisit = async () => {
    let finalDoctorId = doctorId;
    let finalClinicId = clinicId;

    // 1. إذا كان يتم إضافة دكتور جديد
    if (isAddingNewDoctor) {
      if (!newDoctorName.trim()) {
        alert('يرجى إدخال اسم الطبيب الجديد');
        return;
      }
      setIsSubmitting(true);
      try {
        const resDoc = await dispatch(addDoctor({ name: newDoctorName.trim() })).unwrap();
        finalDoctorId = resDoc?.id || resDoc?.doctor?.id;
      } catch (err) {
        alert('حدث خطأ أثناء حفظ الطبيب الجديد: ' + err);
        setIsSubmitting(false);
        return;
      }
    }

    // 2. إذا كان يتم إضافة عيادة جديدة
    if (isAddingNewClinic) {
      if (!newClinicName.trim()) {
        alert('يرجى إدخال اسم العيادة الجديدة');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(true);
      try {
        const resClinic = await dispatch(addClinic({ clinic_name: newClinicName.trim() })).unwrap();
        finalClinicId = resClinic?.id;
      } catch (err) {
        alert('حدث خطأ أثناء حفظ العيادة الجديدة: ' + err);
        setIsSubmitting(false);
        return;
      }
    }

    if (!finalDoctorId) {
      alert('يرجى اختيار أو إضافة طبيب');
      setIsSubmitting(false);
      return;
    }

    if (!finalClinicId) {
      alert('يرجى اختيار أو إضافة عيادة');
      setIsSubmitting(false);
      return;
    }

    if (!weekNumber) {
      alert('يرجى إدخال رقم الأسبوع');
      setIsSubmitting(false);
      return;
    }

    const visitData = {
      doctor_id: finalDoctorId,
      clinic_id: finalClinicId,
      week_number: Number(weekNumber),
      visit_date: new Date().toISOString().split('T')[0],
      notes,
    };

    try {
      await dispatch(addVisit(visitData));
      // إعادة تعيين النموذج
      setDoctorId('');
      setClinicId('');
      setWeekNumber('');
      setNotes('');
      setIsAddingNewDoctor(false);
      setNewDoctorName('');
      setIsAddingNewClinic(false);
      setNewClinicName('');
    } catch (err) {
      console.error('Error adding visit:', err);
    } finally {
      setIsSubmitting(false);
    }
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

      {/* نموذج إضافة زيارة مع دعم إضافة دكتور/عيادة تلقائياً وربط العيادات بالطبيب */}
      <div
        style={{
          background: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
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
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
            ➕ تسجيل زيارة جديدة
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isAddingNewDoctor && (
              <button
                type="button"
                onClick={() => setIsAddingNewDoctor(true)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🩺 + دكتور جديد
              </button>
            )}
            {!isAddingNewClinic && (
              <button
                type="button"
                onClick={() => setIsAddingNewClinic(true)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🏥 + عيادة جديدة
              </button>
            )}
          </div>
        </div>

        <div className="responsive-form-row" style={{ alignItems: 'flex-start' }}>
          {/* حقل اختيار أو إضافة الطبيب */}
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>الطبيب:</label>
            {isAddingNewDoctor ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="اكتب اسم الطبيب الجديد..."
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  style={{ flex: 1, border: '2px solid #3b82f6' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewDoctor(false);
                    setNewDoctorName('');
                  }}
                  title="إلغاء واختيار من القائمة"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0 8px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={doctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
              >
                <option value="">اختر الطبيب</option>
                <option value="__NEW__" style={{ color: '#2563eb', fontWeight: 'bold' }}>
                  ➕ + إضافة طبيب جديد
                </option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* حقل اختيار أو إضافة العيادة مع إظهار العيادات المرتبطة بالطبيب أولاً */}
          <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>العيادة:</label>
            {isAddingNewClinic ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="اكتب اسم العيادة الجديدة..."
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  style={{ flex: 1, border: '2px solid #10b981' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewClinic(false);
                    setNewClinicName('');
                  }}
                  title="إلغاء واختيار من القائمة"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0 8px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={clinicId}
                onChange={(e) => handleClinicChange(e.target.value)}
              >
                <option value="">اختر العيادة</option>
                <option value="__NEW__" style={{ color: '#059669', fontWeight: 'bold' }}>
                  ➕ + إضافة عيادة جديدة لهذا الطبيب
                </option>

                {/* عيادات سابقة لهذا الطبيب من جدول الزيارات */}
                {associatedClinics.length > 0 && (
                  <optgroup label="⭐ عيادات مسجلة لهذا الطبيب سابقاً">
                    {associatedClinics.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        ⭐ {cl.clinic_name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* باقي العيادات */}
                <optgroup label="🏥 باقي العيادات المتاحة">
                  {otherClinics.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.clinic_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}
          </div>

          {/* رقم الأسبوع */}
          <div style={{ flex: '0 1 100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>الأسبوع:</label>
            <input
              type="number"
              placeholder="1"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
            />
          </div>

          {/* الملاحظات */}
          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>ملاحظات:</label>
            <input
              type="text"
              placeholder="ملاحظات الزيارة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* زر الحفظ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignSelf: 'flex-end' }}>
            <label style={{ fontSize: '12px', opacity: 0 }}>حفظ</label>
            <button
              onClick={handleAddVisit}
              disabled={isSubmitting}
              className="form-btn-full"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '7px',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                padding: '9px 18px',
                transition: 'background-color 0.2s',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? '⏳ جاري الحفظ...' : '+ إضافة زيارة'}
            </button>
          </div>
        </div>

        {/* عرض وسوم سريعة للعيادات المرتبطة بالطبيب لسهولة الاختيار بضغطة واحدة */}
        {doctorId && !isAddingNewDoctor && associatedClinics.length > 0 && !isAddingNewClinic && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
              ⭐ العيادات المسجلة لهذا الطبيب:
            </span>
            {associatedClinics.map((ac) => {
              const isSelected = String(clinicId) === String(ac.id);
              return (
                <button
                  key={ac.id}
                  type="button"
                  onClick={() => setClinicId(String(ac.id))}
                  style={{
                    backgroundColor: isSelected ? '#2563eb' : '#eff6ff',
                    color: isSelected ? '#ffffff' : '#1d4ed8',
                    border: `1px solid ${isSelected ? '#1d4ed8' : '#bfdbfe'}`,
                    borderRadius: '16px',
                    padding: '3px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  🏥 {ac.clinic_name}
                </button>
              );
            })}
          </div>
        )}
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

