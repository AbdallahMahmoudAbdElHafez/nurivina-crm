// src/api/apiClient.js
import axios from 'axios';

const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // إذا كان الموقع مفتوح عبر HTTPS أو نطاق خارجي نستخدم المسار النسبي عبر البروكسي
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '/api';
  }
  // التكيف التلقائي مع عنوان الـ IP عند فتح التطبيق من الهاتف على نفس الشبكة المحلية
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:4000/api`;
  }
  return 'http://localhost:4000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
