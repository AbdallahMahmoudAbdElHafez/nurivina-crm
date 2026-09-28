import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, token } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ full_name: '', password: '' });

  useEffect(() => {
    if (token && status === 'succeeded') {
      navigate('/home');
    }
  }, [token, status, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(form));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          borderRadius: '16px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚡</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            تسجيل الدخول
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            نظام CRM وإدارة الزيارات والمندوبين
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              الاسم الكامل
            </label>
            <input
              type="text"
              name="full_name"
              placeholder="أدخل اسمك الكامل"
              value={form.full_name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              كلمة المرور
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
              marginTop: '8px',
              transition: 'background-color 0.2s',
            }}
          >
            {status === 'loading' ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
