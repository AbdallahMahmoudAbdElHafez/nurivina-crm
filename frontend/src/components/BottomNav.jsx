import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function BottomNav() {
  const { token, user } = useSelector((s) => s.auth);
  const { pendingCount } = useNetworkStatus();

  if (!token) return null;

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const NAV_ITEMS = [
    { to: '/home', label: 'الرئيسية', icon: '🏠' },
    { to: '/visits', label: 'الزيارات', icon: '📅', badge: pendingCount > 0 ? pendingCount : null },
    { to: '/visit-plans', label: 'الخطط', icon: '📋' },
    { to: '/doctors', label: 'الأطباء', icon: '🩺' },
    ...(isAdminOrManager
      ? [{ to: '/location-map', label: 'الخريطة', icon: '🗺' }]
      : [{ to: '/clinics', label: 'العيادات', icon: '🏥' }]),
  ];

  return (
    <nav className="bottom-nav-bar" aria-label="شريط التنقل السفلي">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span>{item.label}</span>
          {item.badge && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                left: 'calc(50% - 18px)',
                backgroundColor: '#f59e0b',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '10px',
                padding: '1px 5px',
                fontWeight: 700,
                lineHeight: '1.2',
              }}
            >
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
