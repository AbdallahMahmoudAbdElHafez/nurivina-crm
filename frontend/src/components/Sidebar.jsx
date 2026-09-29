import React from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";

export default function Sidebar({ isOpen = true, onClose, isMobile = false }) {
  const dispatch = useDispatch();
  const { token, user } = useSelector((s) => s.auth);

  if (!token) return null;

  const sidebarWidth = 240;

  // تنسيق القائمة الجانبية مع دعم الموبايل والدوران المنزلق
  const styleAside = {
    position: "fixed",
    top: 0,
    right: 0, // من اليمين لتوافق العربية RTL
    height: "100vh",
    width: sidebarWidth,
    background: "#0f172a",
    color: "#f8fafc",
    boxShadow: isMobile ? "0 0 25px rgba(0,0,0,0.5)" : "2px 0 10px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    zIndex: 1100,
    paddingBottom: 16,
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    transform: isMobile
      ? isOpen
        ? "translateX(0)"
        : "translateX(100%)"
      : "translateX(0)",
  };

  const linkStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    margin: "4px 10px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: active ? "600" : "500",
    color: active ? "#fff" : "#cbd5e1",
    background: active ? "#16a34a" : "transparent",
    transition: "background 0.2s, color 0.2s",
  });

  const LINKS = [
    ...(user?.role === "admin"
      ? [{ to: "/users", label: "المستخدمين", icon: "👥" }]
      : []),
    { to: "/doctors", label: "الأطباء", icon: "🩺" },
    { to: "/cities", label: "المناطق", icon: "📍" },
    { to: "/clinics", label: "العيادات", icon: "🏥" },
    { to: "/visit-plans", label: "خطط CRM", icon: "📋" },
    { to: "/visits", label: "الزيارات والمواقع", icon: "📅" },
    ...(user?.role === "admin" || user?.role === "manager"
      ? [
          { to: "/pending-approvals", label: "الاعتمادات المعلّقة", icon: "⏳" },
          { to: "/doctor-user-manager", label: "ربط الأطباء بالمندوبين", icon: "🔗" },
          { to: "/location-map", label: "خريطة المواقع", icon: "🗺" },
        ]
      : []),
  ];

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* خلفية معتمة على الموبايل عند فتح القائمة */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 1050,
            transition: "opacity 0.3s",
          }}
        />
      )}

      <aside style={styleAside} data-testid="sidebar">
        <div>
          {/* ترويسة القائمة مع زر الإغلاق للموبايل */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>⚡</span>
              <span style={{ fontWeight: 700, fontSize: "16px" }}>CRM لوحة التحكم</span>
            </div>
            {isMobile && (
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
                title="إغلاق القائمة"
              >
                ✕
              </button>
            )}
          </div>

          {/* روابط التنقل */}
          <nav style={{ marginTop: 12 }}>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={handleLinkClick}
                style={({ isActive }) => linkStyle(isActive)}
              >
                <span style={{ fontSize: 18 }}>{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* زر تسجيل الخروج */}
        <div style={{ padding: "12px 14px" }}>
          <button
            onClick={() => dispatch(logout())}
            style={{
              width: "100%",
              display: "flex",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
              background: "#dc2626",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              transition: "background 0.2s",
            }}
          >
            <span>🔓</span>
            <span>تسجيل خروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
