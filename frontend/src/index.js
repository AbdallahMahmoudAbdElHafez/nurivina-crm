import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// تسجيل الـ Service Worker لدعم الـ PWA والعمل بدون اتصال
serviceWorkerRegistration.register();
