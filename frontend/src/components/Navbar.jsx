import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function Navbar({ onToggleSidebar, isMobile }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  const { isOnline, pendingCount, isSyncing, syncNow } = useNetworkStatus();

  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    } else {
      // إرشادات بديلة عند الفتح عبر عنوان IP الداخلي
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("لتثبيت التطبيق على آيفون:\n1. اضغط على زر المشاركة (📤) أسفل الشاشة.\n2. اختر 'إضافة إلى الصفحة الرئيسية' (Add to Home Screen).");
      } else {
        alert("لتثبيت التطبيق على هاتفك:\n1. اضغط على زر القائمة (الثلاث نقاط ⋮) في أعلى المتصفح.\n2. اختر 'الإضافة إلى الشاشة الرئيسية' (Add to Home screen).");
      }
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        padding: '10px 16px',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* القسم الأيمن: زر القائمة للموبايل وشارة الاتصال */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {token && isMobile && (
          <button
            onClick={onToggleSidebar}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              fontSize: '18px',
            }}
            title="فتح القائمة"
          >
            ☰
          </button>
        )}

        {/* مؤشر حالة الاتصال بالإنترنت */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
            color: isOnline ? '#15803d' : '#b91c1c',
            border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}`,
          }}
          title={isOnline ? 'أنت متصل بالإنترنت' : 'أنت في وضع عدم الاتصال (Offline)'}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#22c55e' : '#ef4444',
            }}
          />
          <span>{isOnline ? 'متصل' : 'أوفلاين'}</span>
        </div>

        {/* مؤشر العمليات المعلقة في شريط التنقل */}
        {pendingCount > 0 && (
          <button
            onClick={syncNow}
            disabled={!isOnline || isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isOnline && !isSyncing ? 'pointer' : 'default',
            }}
            title={isOnline ? 'انقر للمزامنة مع السيرفر' : 'محفوظ محلياً - سيتم الإرسال فور توفر النت'}
          >
            <span>{isSyncing ? '⏳' : '💾'}</span>
            <span>{pendingCount} معلق</span>
          </button>
        )}
      </div>

      {/* القسم الأيسر: زر التثبيت والمستخدم وتسجيل الخروج */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* زر تثبيت التطبيق للموبايل */}
        {isMobile && (
          <button
            onClick={handleInstallClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '6px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="تثبيت التطبيق على الشاشة الرئيسية"
          >
            <span>📲</span>
            <span>تثبيت</span>
          </button>
        )}

        {token && user ? (
          <>
            <span
              style={{
                fontSize: '13px',
                color: '#475569',
                fontWeight: 500,
                display: 'inline-block',
                maxWidth: '110px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.full_name || user.username || 'مستخدم'}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              خروج
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to="/login"
              style={{
                fontSize: '13px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              دخول
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
