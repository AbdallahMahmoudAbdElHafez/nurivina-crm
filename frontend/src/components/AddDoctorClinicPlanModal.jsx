import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addDoctor, fetchDoctors } from '../features/doctors/doctorsSlice';
import { addClinic, fetchClinics } from '../features/clinics/clinicsSlice';
import { fetchCities } from '../features/cities/citiesSlice';
import { addVisitPlan, fetchVisitPlans } from '../features/visitPlans/visitPlansSlice';

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

  // وضع اختيار الدكتور: 'existing' أو 'new'
  const [doctorMode, setDoctorMode] = useState('new'); // 'new' | 'existing'
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [newDoctorName, setNewDoctorName] = useState('');

  // تفاصيل العيادة
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [cityId, setCityId] = useState('');

  // بيانات خطة الزيارة (visit_plans)
  const [marketClass, setMarketClass] = useState('');
  const [visitFrequency, setVisitFrequency] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

      setClinicName('');
      setClinicAddress('');
      setClinicPhone('');
      setCityId('');
      setMarketClass('');
      setVisitFrequency('');
      setErrorMsg('');

      if (!cities || cities.length === 0) dispatch(fetchCities());
      if (!doctors || doctors.length === 0) dispatch(fetchDoctors());
      if (!clinics || clinics.length === 0) dispatch(fetchClinics());
    }
  }, [isOpen, initialDoctorId, initialDoctorName, dispatch]);

  if (!isOpen) return null;

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
    if (!clinicName.trim()) {
      setErrorMsg('يرجى إدخال اسم العيادة الجديدة');
      return;
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

      // 2. إضافة العيادة الجديدة
      const clinicPayload = {
        clinic_name: clinicName.trim(),
        address: clinicAddress.trim() || null,
        clinic_phone: clinicPhone.trim() || null,
        city_id: cityId ? Number(cityId) : null,
      };
      const clinicObj = await dispatch(addClinic(clinicPayload)).unwrap();
      const finalClinicId = clinicObj?.id;

      // 3. حفظ/تحديث خطة الزيارة visit_plans (marketClass, visit_frequency, doctor_id, clinic_id)
      let planObj = null;
      if (finalDocId && (marketClass || visitFrequency || finalClinicId)) {
        try {
          const planPayload = {
            doctor_id: Number(finalDocId),
            clinic_id: finalClinicId ? Number(finalClinicId) : null,
            marketClass: marketClass ? marketClass.trim() : null,
            visit_frequency: visitFrequency ? Number(visitFrequency) : null,
            schedules: [],
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
          maxWidth: '560px',
          maxHeight: '92vh',
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
                إضافة دكتور وعيادة وخطة الزيارات
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                إضافة طبيب جديد أو عيادة جديدة مع بيانات الخطة والتكرار
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

          {/* 2. قسم بيانات العيادة الجديدة */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
              🏥 2. تفاصيل العيادة الجديدة
            </div>

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
                  style={{ width: '100%' }}
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
          </div>

          {/* 3. قسم خطة الزيارة والتصنيف (visit_plans) */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534', marginBottom: '12px' }}>
              📋 3. خطة وتصنيف الطبيب (Visit Plan)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  Market Class (التصنيف):
                </label>
                <select
                  value={marketClass}
                  onChange={(e) => setMarketClass(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#ffffff' }}
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
                  style={{ width: '100%', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '10px',
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
