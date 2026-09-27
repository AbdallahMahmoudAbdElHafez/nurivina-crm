import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ full_name: '', password: '' });

  useEffect(() => {
    if (user && status === 'succeeded') {
      navigate('/login');
    }
  }, [user, status, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(register(form));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg rounded-xl p-6 w-96">
        <h2 className="text-xl font-bold mb-4 text-center">تسجيل حساب جديد</h2>
        {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-2">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="full_name"
            placeholder="الاسم الكامل"
            value={form.full_name}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
          <input
            type="password"
            name="password"
            placeholder="كلمة المرور"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {status === 'loading' ? 'جاري التسجيل...' : 'تسجيل'}
          </button>
        </form>
      </div>
    </div>
  );
}
