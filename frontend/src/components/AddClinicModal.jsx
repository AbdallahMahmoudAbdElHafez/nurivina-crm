import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addClinic } from '../features/clinics/clinicsSlice';
import { fetchCities } from '../features/cities/citiesSlice';

export default function AddClinicModal({ isOpen, onClose, onClinicAdded, defaultName = '' }) {
  const dispatch = useDispatch();
  const { list: cities } = useSelector((state) => state.cities);

  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [cityId, setCityId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setClinicName(defaultName || '');
      setAddress('');
      setClinicPhone('');
      setCityId('');
      setErrorMsg('');
      if (!cities || cities.length === 0) {
        dispatch(fetchCities());
      }
    }
  }, [isOpen, defaultName, dispatch, cities]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!clinicName.trim()) {
      setErrorMsg('يرجى إدخال اسم العيادة');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        clinic_name: clinicName.trim(),
        address: address.trim() || null,
        clinic_phone: clinicPhone.trim() || null,
        city_id: cityId ? Number(cityId) : null,
      };

      const res = await dispatch(addClinic(payload)).unwrap();
      if (onClinicAdded) {
        onClinicAdded(res);
      }
      onClose();
    } catch (err) {
      setErrorMsg(typeof err === 'string' ? err : 'حدث خطأ أثناء حفظ العيادة');
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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🏥</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              إضافة بيانات عيادة جديدة
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              height: '32px',
              width: '32px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
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
                marginBottom: '16px',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* اسم العيادة */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                اسم العيادة <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: عيادة النور التخصصية"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                autoFocus
                required
                style={{
                  width: '100%',
                  borderColor: errorMsg ? '#ef4444' : '#cbd5e1',
                }}
              />
            </div>

            {/* العنوان */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                العنوان
              </label>
              <input
                type="text"
                placeholder="مثال: شارع التحرير، برج الأطباء، الدور الثالث"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* الهاتف والمدينة جنباً إلى جنب */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  رقم الهاتف
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
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  المدينة
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

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '22px',
              paddingTop: '14px',
              borderTop: '1px solid #f1f5f9',
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
                padding: '8px 22px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? 'جاري الحفظ...' : '💾 حفظ العيادة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
