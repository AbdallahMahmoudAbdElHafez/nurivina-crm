import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialReactTable } from 'material-react-table';
import { fetchVisits, addVisit, updateVisitLocally } from '../features/visits/visitsSlice';
import { fetchVisitPlans } from '../features/visitPlans/visitPlansSlice';
import api from '../api/apiClient';
import { fetchDoctors, addDoctor } from '../features/doctors/doctorsSlice';
import { fetchClinics, addClinic } from '../features/clinics/clinicsSlice';
import { fetchCities } from '../features/cities/citiesSlice';
import { savePendingLocation } from '../hooks/useOfflineSync';
import AddClinicModal from './AddClinicModal';
import AddDoctorClinicPlanModal from './AddDoctorClinicPlanModal';
import CompleteVisitModal from './CompleteVisitModal';

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

    const getPositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 ثانية لإعطاء شريحة الـ GPS وقتاً كافياً للاتصال بالأقمار في وضع الأوفلاين
      maximumAge: 120000, // قبول موقع موثوق تم التقاطه خلال آخر دقيقتين إن وجد
    };

    const onPosSuccess = async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      // استخدام الوقت الفعلي الخاص بإشارة الـ GPS لمنع التلاعب
      const sharedAt = position.timestamp 
        ? new Date(position.timestamp).toISOString() 
        : new Date().toISOString();

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
    };

    const onPosError = (error) => {
      console.warn('High accuracy failed, trying fallback...', error);
      // محاولة ثانية بدقة قياسية في حالة كان الهاتف أوفلاين ويواجه صعوبة في التقاط الأقمار فوراً
      navigator.geolocation.getCurrentPosition(
        onPosSuccess,
        (fallbackError) => {
          console.error('خطأ في تحديد الموقع:', fallbackError);
          let msg = 'تعذّر الحصول على موقعك.';
          if (fallbackError.code === 1) {
            msg = 'تم رفض إذن الوصول للموقع. يرجى تفعيل إذن الموقع للمتصفح من إعدادات الهاتف.';
          } else if (fallbackError.code === 2) {
            msg = 'إشارة الـ GPS غير متوفرة حالياً. تأكد من تفعيل الموقع والخروج لمكان مفتوح.';
          } else if (fallbackError.code === 3) {
            msg = 'استغرق الاتصال بالأقمار الصناعية وقتاً طويلاً. يرجى المحاولة مرة أخرى.';
          }
          alert(msg);
          setLoading(false);
          setStatus('error');
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
      );
    };

    navigator.geolocation.getCurrentPosition(onPosSuccess, onPosError, getPositionOptions);
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
  const { list: visitPlans } = useSelector((s) => s.visitPlans || { list: [] });
  const doctors = useSelector((s) => s.doctors.list);
  const clinics = useSelector((s) => s.clinics.list);
  const { list: cities } = useSelector((s) => s.cities);

  const [doctorId, setDoctorId] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [notes, setNotes] = useState('');

  // حالات إضافة دكتور أو عيادة جديدة داخل نموذج الزيارة
  const [isAddingNewDoctor, setIsAddingNewDoctor] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [isClinicModalOpen, setIsClinicModalOpen] = useState(false);
  const [isDoctorClinicPlanModalOpen, setIsDoctorClinicPlanModalOpen] = useState(false);
  const [modalDoctorId, setModalDoctorId] = useState('');
  const [sessionAddedClinics, setSessionAddedClinics] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حالة دايلوج إنهاء الزيارة (ملاحظات + تمت/لم تتم + شير لوكيشن خروج)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedVisitForComplete, setSelectedVisitForComplete] = useState(null);

  // حالة مشاركة الموقع قبل تسجيل الزيارة
  const [sharedLocation, setSharedLocation] = useState(null); // { lat, lng, time }
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // دالة تحديد ومشاركة الموقع لنموذج الزيارة
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('متصفحك لا يدعم تحديد الموقع الجغرافي GPS');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    const onPosSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // استخدام الوقت الصادر من إشارة الـ GPS
      const time = pos.timestamp ? new Date(pos.timestamp).toISOString() : new Date().toISOString();
      setSharedLocation({ lat, lng, time });
      setIsLocating(false);
      setLocationError('');
    };

    const onPosError = (err) => {
      console.warn('High accuracy capture failed, attempting fallback...', err);
      navigator.geolocation.getCurrentPosition(
        onPosSuccess,
        (fallbackErr) => {
          console.error('Location capture error:', fallbackErr);
          setIsLocating(false);
          let msg = 'تعذر الحصول على الموقع.';
          if (fallbackErr.code === 1) {
            msg = 'تم رفض الإذن. يرجى تفعيل إذن الموقع للمتصفح من إعدادات الموبايل.';
          } else if (fallbackErr.code === 2) {
            msg = 'إشارة الـ GPS غير متوفرة حالياً. تأكد من الخروج لمكان مفتوح لتلقي إشارة الأقمار.';
          } else if (fallbackErr.code === 3) {
            msg = 'استغرق تحديد الموقع وقتاً طويلاً. يرجى المحاولة مجدداً.';
          }
          setLocationError(msg);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      onPosError,
      { timeout: 30000, enableHighAccuracy: true, maximumAge: 120000 }
    );
  };

  useEffect(() => {
    dispatch(fetchVisits());
    dispatch(fetchVisitPlans());
    dispatch(fetchDoctors());
    dispatch(fetchClinics());
    dispatch(fetchCities());

    const handleDataSynced = () => {
      dispatch(fetchVisits());
      dispatch(fetchVisitPlans());
      dispatch(fetchDoctors());
      dispatch(fetchClinics());
      dispatch(fetchCities());
    };
    window.addEventListener('crm_data_synced', handleDataSynced);
    return () => window.removeEventListener('crm_data_synced', handleDataSynced);
  }, [dispatch]);

  // حساب العيادات المرتبطة بالطبيب المختار من جدول خطط الزيارات (visit_plans) والعيادات المضافة حديثاً
  const { associatedClinics, otherClinics } = useMemo(() => {
    if (!doctorId || isAddingNewDoctor || doctorId === '__NEW__') {
      return { associatedClinics: sessionAddedClinics, otherClinics: clinics };
    }

    // استخراج معرّفات العيادات المسجلة لهذا الطبيب من جدول خطط الزيارات (visit_plans)
    const doctorPlans = (visitPlans || []).filter(
      (p) => String(p.doctor_id || p.doctor?.id) === String(doctorId)
    );

    const associatedIds = new Set(
      doctorPlans.map((p) => String(p.clinic_id || p.clinic?.id)).filter(Boolean)
    );

    // إضافة العيادات التي تمت إضافتها في هذه الجلسة
    sessionAddedClinics.forEach((sc) => {
      if (String(sc.forDoctorId) === String(doctorId) || !sc.forDoctorId) {
        associatedIds.add(String(sc.id));
      }
    });

    const associated = [];
    const others = [];

    // دمج العيادات من قائمة clinics بالإضافة إلى sessionAddedClinics
    const allKnownClinics = [...clinics];
    sessionAddedClinics.forEach((sc) => {
      if (!allKnownClinics.some((c) => String(c.id) === String(sc.id))) {
        allKnownClinics.push(sc);
      }
    });

    allKnownClinics.forEach((c) => {
      if (associatedIds.has(String(c.id))) {
        associated.push(c);
      } else {
        others.push(c);
      }
    });

    return { associatedClinics: associated, otherClinics: others };
  }, [doctorId, isAddingNewDoctor, visitPlans, clinics, sessionAddedClinics]);

  // عند تغيير الطبيب
  const handleDoctorChange = (val) => {
    if (val === '__NEW__') {
      setModalDoctorId('');
      setIsDoctorClinicPlanModalOpen(true);
    } else {
      setIsAddingNewDoctor(false);
      setDoctorId(val);

      if (val) {
        // فحص العيادات المسجلة لهذا الطبيب من جدول خطط الزيارات visit_plans
        const doctorPlans = (visitPlans || []).filter(
          (p) => String(p.doctor_id || p.doctor?.id) === String(val)
        );
        const associatedIds = new Set(
          doctorPlans.map((p) => String(p.clinic_id || p.clinic?.id)).filter(Boolean)
        );
        sessionAddedClinics.forEach((sc) => {
          if (String(sc.forDoctorId) === String(val)) {
            associatedIds.add(String(sc.id));
          }
        });

        const matched = clinics.filter((c) => associatedIds.has(String(c.id)));

        if (matched.length === 0) {
          setClinicId('');
        } else if (matched.length === 1) {
          // لديه عيادة واحدة مسجلة في خطته: اختيار تلقائي مباشر
          setClinicId(String(matched[0].id));
        } else {
          // لديه أكثر من عيادة: نختار الأولى أو نجعلها فارغة للاختيار
          setClinicId(String(matched[0].id));
        }
      } else {
        setClinicId('');
      }
    }
  };

  // عند تغيير العيادة
  const handleClinicChange = (val) => {
    if (val === '__NEW__') {
      setModalDoctorId(doctorId || '');
      setIsDoctorClinicPlanModalOpen(true);
    } else {
      setClinicId(val);
    }
  };

  // عند الحفظ من الدايلوج الشامل (طبيب + عيادة + خطة وتكرار)
  const handleDoctorClinicPlanSaved = ({ doctor, clinic, isNewDoctor }) => {
    const docId = String(doctor?.id || '');
    const clId = String(clinic?.id || '');

    if (clId) {
      const enriched = {
        ...clinic,
        forDoctorId: docId,
      };
      setSessionAddedClinics((prev) => [...prev, enriched]);
    }

    if (docId) {
      setDoctorId(docId);
      setIsAddingNewDoctor(false);
      setNewDoctorName('');
    }
    if (clId) {
      setClinicId(clId);
    }
  };

  // عند إضافة عيادة جديدة بنجاح عبر الدايلوج القديم إن وجد
  const handleClinicAdded = (newClinic) => {
    const enriched = {
      ...newClinic,
      forDoctorId: doctorId || (isAddingNewDoctor ? '__PENDING_DOCTOR__' : null),
    };
    setSessionAddedClinics((prev) => [...prev, enriched]);
    setClinicId(String(newClinic.id));
  };

  // الحصول على كائن العيادة المختارة حالياً
  const selectedClinicObj = useMemo(() => {
    if (!clinicId) return null;
    return (
      clinics.find((c) => String(c.id) === String(clinicId)) ||
      sessionAddedClinics.find((c) => String(c.id) === String(clinicId)) ||
      null
    );
  }, [clinicId, clinics, sessionAddedClinics]);

  // معالجة تسجيل الزيارة وحفظ الطبيب/العيادة إن وُجدا
  const handleAddVisit = async () => {
    let finalDoctorId = doctorId;
    let finalClinicId = clinicId;
    let newDoctorFlag = false;
    let newClinicFlag = false;

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
        newDoctorFlag = true;
        newClinicFlag = true; // دكتور جديد يعني العيادة أيضاً جديدة
      } catch (err) {
        alert('حدث خطأ أثناء حفظ الطبيب الجديد: ' + err);
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
      alert('يرجى اختيار أو إضافة عيادة جديدة لهذا الطبيب عبر الدايلوج');
      setIsClinicModalOpen(true);
      setIsSubmitting(false);
      return;
    }

    // 0. التحقق الإلزامي من مشاركة الموقع GPS قبل حفظ الزيارة
    if (!sharedLocation || !sharedLocation.lat || !sharedLocation.lng) {
      alert('⚠️ يجب مشاركة موقعك الجغرافي (Share Location) أولاً قبل تسجيل الزيارة!');
      handleCaptureLocation();
      setIsSubmitting(false);
      return;
    }

    if (!weekNumber) {
      alert('يرجى إدخال رقم الأسبوع');
      setIsSubmitting(false);
      return;
    }

    // فحص إذا كانت العيادة جديدة (مضافة في هذه الجلسة ولم يكن دكتور جديد)
    if (!newDoctorFlag && !newClinicFlag) {
      const isSessionClinic = sessionAddedClinics.some(
        (sc) => String(sc.id) === String(finalClinicId)
      );
      if (isSessionClinic) {
        newClinicFlag = true;
      }
    }

    const visitData = {
      doctor_id: finalDoctorId,
      clinic_id: finalClinicId,
      week_number: Number(weekNumber),
      visit_date: new Date().toISOString().split('T')[0],
      notes,
      is_new_doctor: newDoctorFlag,
      is_new_clinic: newClinicFlag,
      visit_lat: sharedLocation.lat,
      visit_lng: sharedLocation.lng,
      shared_lat: sharedLocation.lat,
      shared_lng: sharedLocation.lng,
      shared_at: sharedLocation.time || new Date().toISOString(),
    };

    try {
      const result = await dispatch(addVisit(visitData)).unwrap();
      // إعادة تعيين النموذج
      setDoctorId('');
      setClinicId('');
      setWeekNumber('');
      setNotes('');
      setIsAddingNewDoctor(false);
      setNewDoctorName('');
      setSessionAddedClinics([]);
      setSharedLocation(null);
      setLocationError('');

      // عرض رسالة إذا كانت الزيارة تحتاج اعتماد
      if (result?.status === 'pending_approval') {
        let reasonText = 'بانتظار اعتماد المدير المباشر';
        if (result?.approval_type === 'new_doctor') reasonText = 'طبيب جديد - بانتظار اعتماد المدير';
        else if (result?.approval_type === 'new_clinic') reasonText = 'عيادة جديدة - بانتظار اعتماد المدير';
        else if (result?.approval_type === 'location_deviation') reasonText = `انحراف موقع (${result?.deviation_meters}م) - بانتظار اعتماد المدير`;
        
        alert(`⏳ تم تسجيل الزيارة بنجاح: ${reasonText}`);
      } else {
        alert('✅ تم تسجيل الزيارة ومشاركة موقعك بنجاح!');
      }
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
      id: 'approval_status',
      header: 'حالة الاعتماد',
      size: 140,
      Cell: ({ row }) => {
        const st = row.original.status || 'approved';
        if (st === 'pending_approval') {
          const type = row.original.approval_type;
          let label = '⏳ بانتظار الاعتماد';
          if (type === 'new_doctor') label = '🩺 دكتور جديد (معلّق)';
          else if (type === 'new_clinic') label = '🏥 عيادة جديدة (معلّقة)';
          else if (type === 'location_deviation') label = `📍 انحراف موقع (${row.original.deviation_meters || ''}م)`;

          return (
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: '14px',
              fontSize: '11px', fontWeight: 700,
              background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          );
        }
        if (st === 'rejected') {
          return (
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: '14px',
              fontSize: '11px', fontWeight: 700,
              background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
              whiteSpace: 'nowrap',
            }} title={row.original.rejection_reason || 'تم الرفض'}>
              ❌ مرفوضة
            </span>
          );
        }
        return (
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: '14px',
            fontSize: '11px', fontWeight: 700,
            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
            whiteSpace: 'nowrap',
          }}>
            ✅ معتمدة
          </span>
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
    {
      id: 'completeVisit',
      header: 'إنهاء الزيارة',
      size: 160,
      enableSorting: false,
      enableColumnFilter: false,
      Cell: ({ row }) => {
        const v = row.original;
        const alreadyDone = v.visit_outcome === 'completed' || v.visit_outcome === 'not_completed';

        if (alreadyDone) {
          const isCompleted = v.visit_outcome === 'completed';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: isCompleted ? '#f0fdf4' : '#fef2f2',
                  color: isCompleted ? '#16a34a' : '#dc2626',
                  border: `1px solid ${isCompleted ? '#bbf7d0' : '#fca5a5'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {isCompleted ? '✅ تمت الزيارة' : '❌ لم تتم'}
              </span>
              {v.exit_at && (
                <span style={{ fontSize: '10px', color: '#6b7280' }}>
                  🕐 {new Date(v.exit_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          );
        }

        return (
          <button
            type="button"
            onClick={() => {
              setSelectedVisitForComplete(v);
              setIsCompleteModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #c084fc',
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(168, 85, 247, 0.3)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            📋 إنهاء الزيارة
          </button>
        );
      },
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* الدايلوج الشامل لإضافة دكتور جديد أو عيادة جديدة وتفاصيل الخطة والتكرار */}
      <AddDoctorClinicPlanModal
        isOpen={isDoctorClinicPlanModalOpen}
        onClose={() => setIsDoctorClinicPlanModalOpen(false)}
        onSaved={handleDoctorClinicPlanSaved}
        initialDoctorId={modalDoctorId}
      />

      {/* دايلوج إضافة العيادة القديم كـ Fallback */}
      <AddClinicModal
        isOpen={isClinicModalOpen}
        onClose={() => setIsClinicModalOpen(false)}
        onClinicAdded={handleClinicAdded}
      />

      {/* دايلوج إنهاء الزيارة (ملاحظات + تمت/لم تتم + شير لوكيشن خروج) */}
      <CompleteVisitModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedVisitForComplete(null);
        }}
        visit={selectedVisitForComplete}
        onSuccess={() => {
          dispatch(fetchVisits());
          setIsCompleteModalOpen(false);
          setSelectedVisitForComplete(null);
        }}
      />

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

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setModalDoctorId(doctorId || '');
                setIsDoctorClinicPlanModalOpen(true);
              }}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              🩺 + إضافة دكتور / عيادة / خطة
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
            alignItems: 'start',
          }}
        >
          {/* 1. حقل اختيار أو إضافة الطبيب */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
              🩺 الطبيب <span style={{ color: '#dc2626' }}>*</span>:
            </label>
            {isAddingNewDoctor ? (
              <div style={{ display: 'flex', gap: '6px', height: '40px' }}>
                <input
                  type="text"
                  placeholder="اسم الطبيب الجديد..."
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  style={{ flex: 1, height: '100%', border: '2px solid #3b82f6' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewDoctor(false);
                    setNewDoctorName('');
                    setClinicId('');
                  }}
                  title="إلغاء واختيار من القائمة"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    padding: '0 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    height: '100%',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={doctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                style={{ width: '100%', height: '40px' }}
              >
                <option value="">-- اختر الطبيب --</option>
                <option value="__NEW__" style={{ color: '#2563eb', fontWeight: 'bold' }}>
                  ➕ + إضافة طبيب وعيادة وخطة جديدة...
                </option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. حقل العيادة */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
              🏥 العيادة {doctorId && associatedClinics.length > 0 ? `(${associatedClinics.length})` : ''} <span style={{ color: '#dc2626' }}>*</span>:
            </label>

            {(isAddingNewDoctor || (doctorId && associatedClinics.length === 0)) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedClinicObj ? (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '40px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#166534', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🏥 {selectedClinicObj.clinic_name}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalDoctorId(doctorId || '');
                        setIsDoctorClinicPlanModalOpen(true);
                      }}
                      style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        minHeight: '28px',
                      }}
                    >
                      ✏️ تغيير
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setModalDoctorId(doctorId || '');
                      setIsDoctorClinicPlanModalOpen(true);
                    }}
                    style={{
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      height: '40px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                    }}
                  >
                    🏥 + إضافة عيادة لهذا الطبيب
                  </button>
                )}
              </div>
            ) : (
              <select
                value={clinicId}
                onChange={(e) => handleClinicChange(e.target.value)}
                disabled={!doctorId}
                style={{ width: '100%', height: '40px' }}
              >
                <option value="">
                  {!doctorId ? '⚠️ اختر الطبيب أولاً' : '-- اختر العيادة --'}
                </option>
                {associatedClinics.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    🏥 {cl.clinic_name} {cl.city?.name ? `(${cl.city.name})` : ''}
                  </option>
                ))}
                <option value="__NEW__" style={{ color: '#059669', fontWeight: 'bold' }}>
                  ➕ + إضافة عيادة جديدة لهذا الطبيب...
                </option>
              </select>
            )}
          </div>

          {/* 3. رقم الأسبوع */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
              📅 رقم الأسبوع <span style={{ color: '#dc2626' }}>*</span>:
            </label>
            <input
              type="number"
              min="1"
              max="5"
              placeholder="مثال: 1 أو 2"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              style={{ width: '100%', height: '40px' }}
            />
          </div>

          {/* 4. مشاركة الموقع GPS الإلزامية */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
              📍 مشاركة الموقع <span style={{ color: '#dc2626' }}>* (إلزامي)</span>:
            </label>

            {sharedLocation ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '40px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700 }}>
                  ✅ تم التقاط الموقع ({sharedLocation.lat.toFixed(4)}, {sharedLocation.lng.toFixed(4)})
                </div>
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={isLocating}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '11px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  تحديث
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCaptureLocation}
                disabled={isLocating}
                style={{
                  backgroundColor: isLocating ? '#93c5fd' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  height: '40px',
                  cursor: isLocating ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  width: '100%',
                }}
              >
                {isLocating ? '⏳ جارٍ تحديد موقعك...' : '📍 مشاركة موقعي الآن (GPS)'}
              </button>
            )}
            {locationError && (
              <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                ⚠️ {locationError}
              </span>
            )}
          </div>
        </div>

        {/* صف الملاحظات وزر الحفظ متناسقان تماماً */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: '14px',
            alignItems: 'end',
            marginTop: '14px',
          }}
          className="form-notes-action-row"
        >
          {/* الملاحظات */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
              📝 ملاحظات الزيارة:
            </label>
            <textarea
              placeholder="اكتب أي ملاحظات أو تفاصيل حول الزيارة هنا..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                resize: 'vertical',
                minHeight: '75px',
                maxHeight: '200px',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          {/* زر حفظ الزيارة */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '160px' }}>
            <label style={{ fontSize: '12.5px', opacity: 0 }}>إجراء</label>
            <button
              onClick={handleAddVisit}
              disabled={isSubmitting || isLocating}
              style={{
                backgroundColor: !sharedLocation ? '#64748b' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: (isSubmitting || isLocating) ? 'not-allowed' : 'pointer',
                padding: '0 22px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: !sharedLocation ? 'none' : '0 3px 8px rgba(22, 163, 74, 0.3)',
                transition: 'all 0.2s ease',
                width: '100%',
              }}
              title={!sharedLocation ? 'يجب مشاركة الموقع أولاً' : 'حفظ الزيارة'}
            >
              {isSubmitting ? '⏳ جاري الحفظ...' : '➕ إضافة الزيارة'}
            </button>
          </div>
        </div>

        {/* عرض وسوم سريعة لعيادات الطبيب فقط */}
        {doctorId && !isAddingNewDoctor && associatedClinics.length > 0 && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 700 }}>
              ⭐ عيادات الطبيب المسجلة:
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
                    borderRadius: '20px',
                    padding: '5px 14px',
                    fontSize: '12.5px',
                    lineHeight: 1.4,
                    minHeight: '32px',
                    height: 'auto',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  🏥 {ac.clinic_name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsClinicModalOpen(true)}
              style={{
                backgroundColor: '#ecfdf5',
                color: '#047857',
                border: '1.5px dashed #059669',
                borderRadius: '20px',
                padding: '5px 14px',
                fontSize: '12.5px',
                lineHeight: 1.4,
                minHeight: '32px',
                height: 'auto',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              ➕ عيادة جديدة لهذا الطبيب
            </button>
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

