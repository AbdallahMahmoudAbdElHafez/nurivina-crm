import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addDoctor, fetchDoctors } from '../features/doctors/doctorsSlice';
import { addClinic, fetchClinics } from '../features/clinics/clinicsSlice';
import { fetchCities } from '../features/cities/citiesSlice';
import { addVisitPlan, fetchVisitPlans } from '../features/visitPlans/visitPlansSlice';

const daysOfWeek = [
  { key: 'Saturday', label: 'السبت' },
  { key: 'Sunday', label: 'الأحد' },
  { key: 'Monday', label: 'الإثنين' },
  { key: 'Tuesday', label: 'الثلاثاء' },
  { key: 'Wednesday', label: 'الأربعاء' },
  { key: 'Thursday', label: 'الخميس' },
  { key: 'Friday', label: 'الجمعة' },
];

export default function AddDoctorClinicPlanModal({
  isOpen,
  onClose,
  onSaved,
  initialDoctorId = '',
  initialDoctorName = '',
}) {
  const dispatch = useDispatch();
  const { list: doctors } = useSelector((state) => state.doctors);
  const { list: clinics } = useSelector((state) => state.clinics);
  const { list: cities } = useSelector((state) => state.cities);
  const { list: visitPlans } = useSelector((state) => state.visitPlans);

  // وضع اختيار الدكتور: 'new' أو 'existing'
  const [doctorMode, setDoctorMode] = useState('new'); // 'new' | 'existing'
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [newDoctorName, setNewDoctorName] = useState('');

  // وضع اختيار العيادة: 'existing' أو 'new'
  const [clinicMode, setClinicMode] = useState('existing'); // 'existing' | 'new'
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [cityId, setCityId] = useState('');

  // بيانات خطة الزيارة (visit_plans)
  const [marketClass, setMarketClass] = useState('');
  const [visitFrequency, setVisitFrequency] = useState('');

  // هل حقول الخطة معطلة (لأنه دكتور موجود بالفعل ولديه تصنيف وخطة سابقة)
  const isExistingDoctor = doctorMode === 'existing' && !!selectedDoctorId;

  // مواعيد وجدول الزيارات المتعددة (visit_plan_schedules)
  const [schedules, setSchedules] = useState([]);
  const [currentDay, setCurrentDay] = useState('');
  const [currentTimeFrom, setCurrentTimeFrom] = useState('');
  const [currentTimeTo, setCurrentTimeTo] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // عند تغيير وضع الطبيب أو اختيار طبيب موجود
  useEffect(() => {
    if (doctorMode === 'existing' && selectedDoctorId) {
      // البحث عن أحدث خطة للطبيب المحدد
      const existingPlan = visitPlans && visitPlans.find(
        (vp) => String(vp.doctor_id) === String(selectedDoctorId)
      );
      if (existingPlan) {
        setMarketClass(existingPlan.marketClass || '');
        setVisitFrequency(existingPlan.visit_frequency != null ? String(existingPlan.visit_frequency) : '');
      } else {
        setMarketClass('');
        setVisitFrequency('');
      }
    } else if (doctorMode === 'new') {
      // وضع طبيب جديد - الحقول قابلة للإدخال
      setMarketClass('');
      setVisitFrequency('');
    }
  }, [doctorMode, selectedDoctorId, visitPlans]);

  useEffect(() => {
    if (isOpen) {
      if (initialDoctorId) {
        setDoctorMode('existing');
        setSelectedDoctorId(String(initialDoctorId));
        setNewDoctorName('');
      } else if (initialDoctorName) {
        setDoctorMode('new');
        setNewDoctorName(initialDoctorName);
        setSelectedDoctorId('');
      } else {
        setDoctorMode('new');
        setNewDoctorName('');
        setSelectedDoctorId('');
      }

      setClinicMode('existing');
      setSelectedClinicId('');
      setClinicName('');
      setClinicAddress('');
      setClinicPhone('');
      setCityId('');
      setSchedules([]);
      setCurrentDay('');
      setCurrentTimeFrom('');
      setCurrentTimeTo('');
      setScheduleError('');
      setErrorMsg('');

      if (!cities || cities.length === 0) dispatch(fetchCities());
      if (!doctors || doctors.length === 0) dispatch(fetchDoctors());
      if (!clinics || clinics.length === 0) dispatch(fetchClinics());
      if (!visitPlans || visitPlans.length === 0) dispatch(fetchVisitPlans());
    }
  }, [isOpen, initialDoctorId, initialDoctorName, dispatch]);

  if (!isOpen) return null;

  // إضافة موعد جديد إلى القائمة المحلية
  const handleAddSchedule = () => {
    setScheduleError('');
    if (!currentDay) {
      setScheduleError('يرجى اختيار اليوم');
      return;
    }
    if (!currentTimeFrom) {
      setScheduleError('يرجى تحديد وقت البدء (من)');
      return;
    }
    if (!currentTimeTo) {
      setScheduleError('يرجى تحديد وقت الانتهاء (إلى)');
      return;
    }

    const newScheduleItem = {
      visit_day: currentDay,
      time_from: currentTimeFrom,
      time_to: currentTimeTo,
    };

    setSchedules((prev) => [...prev, newScheduleItem]);
    setCurrentDay('');
    setCurrentTimeFrom('');
    setCurrentTimeTo('');
  };

  // حذف موعد من القائمة
  const handleRemoveSchedule = (index) => {
    setSchedules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // التحقق من الدكتور
    let finalDocId = selectedDoctorId;
    let finalDocName = '';

    if (doctorMode === 'new') {
      if (!newDoctorName.trim()) {
        setErrorMsg('يرجى إدخال اسم الطبيب الجديد');
        return;
      }
      finalDocName = newDoctorName.trim();
    } else {
      if (!selectedDoctorId) {
        setErrorMsg('يرجى اختيار الطبيب من القائمة');
        return;
      }
      const foundDoc = doctors.find((d) => String(d.id) === String(selectedDoctorId));
      if (foundDoc) finalDocName = foundDoc.name;
    }

    // التحقق من العيادة
    let finalClinicId = selectedClinicId;
    let clinicObj = null;

    if (clinicMode === 'new') {
      if (!clinicName.trim()) {
        setErrorMsg('يرجى إدخال اسم العيادة الجديدة');
        return;
      }
    } else {
      if (!selectedClinicId) {
        setErrorMsg('يرجى اختيار العيادة من قائمة العيادات المتاحة أو إضافة عيادة جديدة');
        return;
      }
      clinicObj = clinics.find((c) => String(c.id) === String(selectedClinicId));
    }

    setIsSubmitting(true);

    try {
      // 1. إضافة أو تحديد الطبيب
      let doctorObj = null;
      if (doctorMode === 'new') {
        doctorObj = await dispatch(addDoctor({ name: finalDocName })).unwrap();
        finalDocId = doctorObj?.id || doctorObj?.doctor?.id;
      } else {
        doctorObj = doctors.find((d) => String(d.id) === String(finalDocId));
      }

      // 2. إضافة أو تحديد العيادة
      if (clinicMode === 'new') {
        const clinicPayload = {
          clinic_name: clinicName.trim(),
          address: clinicAddress.trim() || null,
          clinic_phone: clinicPhone.trim() || null,
          city_id: cityId ? Number(cityId) : null,
        };
        clinicObj = await dispatch(addClinic(clinicPayload)).unwrap();
        finalClinicId = clinicObj?.id;
      } else {
        finalClinicId = clinicObj?.id || selectedClinicId;
      }

      // 3. حفظ/تحديث خطة الزيارة visit_plans ومواعيدها visit_plan_schedules
      let planObj = null;
      if (finalDocId && (marketClass || visitFrequency || finalClinicId || schedules.length > 0)) {
        try {
          const planPayload = {
            doctor_id: Number(finalDocId),
            clinic_id: finalClinicId ? Number(finalClinicId) : null,
            marketClass: marketClass ? marketClass.trim() : null,
            visit_frequency: visitFrequency ? Number(visitFrequency) : null,
            schedules: schedules.map((s) => ({
              visit_day: s.visit_day,
              time_from: s.time_from.length === 5 ? `${s.time_from}:00` : s.time_from,
              time_to: s.time_to.length === 5 ? `${s.time_to}:00` : s.time_to,
            })),
          };
          planObj = await dispatch(addVisitPlan(planPayload)).unwrap();
        } catch (planErr) {
          console.warn('Note: visit plan auto-save warning:', planErr);
        }
      }

      // تحديث القوائم العامة
      dispatch(fetchDoctors());
      dispatch(fetchClinics());
      dispatch(fetchVisitPlans());

      if (onSaved) {
        onSaved({
          doctor: doctorObj || { id: finalDocId, name: finalDocName },
          clinic: clinicObj,
          plan: planObj,
          isNewDoctor: doctorMode === 'new',
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving doctor/clinic/plan:', err);
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🩺</span>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                إضافة دكتور وعيادة وخطة الزيارات ومواعيدها
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                تسجيل الطبيب والعيادة مع تحديد التصنيف والتكرار وأيام ومواعيد التواجد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              height: '32px',
              width: '32px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. قسم بيانات الطبيب */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                🩺 1. بيانات الطبيب
              </span>

              <div
                style={{
                  display: 'flex',
                  background: '#e2e8f0',
                  borderRadius: '8px',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDoctorMode('new')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: doctorMode === 'new' ? '#3b82f6' : 'transparent',
                    color: doctorMode === 'new' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  + طبيب جديد
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorMode('existing')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: doctorMode === 'existing' ? '#3b82f6' : 'transparent',
                    color: doctorMode === 'existing' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  طبيب موجود بالفعل
                </button>
              </div>
            </div>

            {doctorMode === 'new' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                  اسم الطبيب الجديد <span style={{ color: '#dc2626' }}>*</span>:
                </label>
                <input
                  type="text"
                  placeholder="مثال: د. أحمد عبد الله"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  autoFocus
                  style={{ width: '100%', border: '1.5px solid #3b82f6' }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                  اختر الطبيب الموجود <span style={{ color: '#dc2626' }}>*</span>:
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- اختر الطبيب من القائمة --</option>
                  {doctors &&
                    doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. قسم بيانات العيادة */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                🏥 2. بيانات العيادة / المركز
              </span>

              <div
                style={{
                  display: 'flex',
                  background: '#e2e8f0',
                  borderRadius: '8px',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setClinicMode('existing')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: clinicMode === 'existing' ? '#059669' : 'transparent',
                    color: clinicMode === 'existing' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  عيادة موجودة بالفعل
                </button>
                <button
                  type="button"
                  onClick={() => setClinicMode('new')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: clinicMode === 'new' ? '#059669' : 'transparent',
                    color: clinicMode === 'new' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  + عيادة جديدة
                </button>
              </div>
            </div>

            {clinicMode === 'existing' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                  اختر العيادة الموجودة <span style={{ color: '#dc2626' }}>*</span>:
                </label>
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #059669', height: '40px' }}
                >
                  <option value="">-- اختر العيادة من القائمة --</option>
                  {clinics &&
                    clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏥 {c.clinic_name} {c.city?.name ? `(${c.city.name})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                    اسم العيادة / المركز <span style={{ color: '#dc2626' }}>*</span>:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: عيادة النور التخصصية"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    style={{ width: '100%', border: '1.5px solid #059669' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                    العنوان بالتفصيل:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: شارع التحرير، برج الأطباء، الدور الثالث"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                      هاتف العيادة:
                    </label>
                    <input
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                      style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                      المدينة:
                    </label>
                    <select
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">اختر المدينة...</option>
                      {cities &&
                        cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. قسم خطة وتصنيف الطبيب ومواعيده المتعددة (visit_plans & schedules) */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534', marginBottom: '12px' }}>
              📋 3. خطة وتصنيف الطبيب ومواعيد التواجد (Visit Plan & Schedules)
            </div>

            {/* التصنيف والتكرار */}
            {isExistingDoctor && (
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#0369a1',
                  backgroundColor: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontWeight: 600,
                }}
              >
                ℹ️ تم جلب تصنيف وتكرار الزيارة تلقائياً من الخطة المسجلة لهذا الطبيب.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  Market Class (التصنيف):
                </label>
                <select
                  value={marketClass}
                  onChange={(e) => setMarketClass(e.target.value)}
                  disabled={isExistingDoctor}
                  style={{
                    width: '100%',
                    backgroundColor: isExistingDoctor ? '#f1f5f9' : '#ffffff',
                    cursor: isExistingDoctor ? 'not-allowed' : 'default',
                    color: isExistingDoctor ? '#64748b' : '#0f172a',
                  }}
                >
                  <option value="">اختر التصنيف (اختياري)...</option>
                  <option value="Class A+">Class A+</option>
                  <option value="Class A">Class A</option>
                  <option value="Class B+">Class B+</option>
                  <option value="Class B">Class B</option>
                  <option value="Class C">Class C</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  Visit Frequency (تكرار الزيارة):
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  placeholder="مثال: 2 أو 4 شهرياً"
                  value={visitFrequency}
                  onChange={(e) => setVisitFrequency(e.target.value)}
                  disabled={isExistingDoctor}
                  style={{
                    width: '100%',
                    backgroundColor: isExistingDoctor ? '#f1f5f9' : '#ffffff',
                    cursor: isExistingDoctor ? 'not-allowed' : 'text',
                    color: isExistingDoctor ? '#64748b' : '#0f172a',
                  }}
                />
              </div>
            </div>

            {/* إضافة مواعيد متعددة للزيارات (Schedules) */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                ⏰ مواعيد وأيام تواجد الطبيب (يمكنك إضافة أكثر من موعد):
              </div>

              {scheduleError && (
                <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600, marginBottom: '6px' }}>
                  ⚠️ {scheduleError}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(110px, 1.2fr) minmax(90px, 1fr) minmax(90px, 1fr) auto',
                  gap: '8px',
                  alignItems: 'end',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>اليوم:</label>
                  <select
                    value={currentDay}
                    onChange={(e) => setCurrentDay(e.target.value)}
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    <option value="">اختر اليوم...</option>
                    {daysOfWeek.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label} ({d.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>من:</label>
                  <input
                    type="time"
                    value={currentTimeFrom}
                    onChange={(e) => setCurrentTimeFrom(e.target.value)}
                    style={{ height: '36px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>إلى:</label>
                  <input
                    type="time"
                    value={currentTimeTo}
                    onChange={(e) => setCurrentTimeTo(e.target.value)}
                    style={{ height: '36px', fontSize: '12px' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddSchedule}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    height: '36px',
                    padding: '0 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + إضافة موعد
                </button>
              </div>

              {/* قائمة المواعيد المضافة */}
              {schedules.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 700 }}>
                    📌 المواعيد المحددة ({schedules.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {schedules.map((s, idx) => {
                      const dayObj = daysOfWeek.find((d) => d.key === s.visit_day);
                      const dayLabel = dayObj ? dayObj.label : s.visit_day;
                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#1e40af',
                            fontWeight: 600,
                          }}
                        >
                          <span>
                            🗓️ {dayLabel}: {s.time_from} - {s.time_to}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSchedule(idx)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#dc2626',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: '1px 5px',
                              fontSize: '10px',
                              fontWeight: 700,
                              minHeight: 'auto',
                            }}
                            title="حذف هذا الموعد"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 18px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 24px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? '⏳ جاري الحفظ...' : '💾 حفظ الطبيب والعيادة والخطة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
