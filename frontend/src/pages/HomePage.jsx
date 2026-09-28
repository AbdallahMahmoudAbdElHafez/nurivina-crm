import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchVisits } from "../features/visits/visitsSlice";
import { fetchDoctors } from "../features/doctors/doctorsSlice";
import { fetchClinics } from "../features/clinics/clinicsSlice";
import { fetchVisitPlans } from "../features/visitPlans/visitPlansSlice";
import useNetworkStatus from "../hooks/useNetworkStatus";

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const visits = useSelector((state) => state.visits?.list || []);
  const doctors = useSelector((state) => state.doctors?.list || []);
  const clinics = useSelector((state) => state.clinics?.list || []);
  const visitPlans = useSelector((state) => state.visitPlans?.list || []);
  const { isOnline, pendingCount, syncNow, isSyncing } = useNetworkStatus();

  useEffect(() => {
    dispatch(fetchVisits());
    dispatch(fetchDoctors());
    dispatch(fetchClinics());
    dispatch(fetchVisitPlans());
  }, [dispatch]);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const roleLabel =
    user?.role === "admin"
      ? "مدير النظام (Admin)"
      : user?.role === "manager"
      ? "مدير منطقة (Manager)"
      : "مندوب دعاية (Medical Rep)";

  // حساب إحصائيات سريعة
  const todayStr = new Date().toISOString().split("T")[0];
  const todayVisits = visits.filter((v) => v.visit_date === todayStr);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* بطاقة الترحيب العلوية */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 4px 15px rgba(15, 23, 42, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "24px" }}>👋</span>
            <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
              مرحباً، {user?.full_name || user?.username || "المستخدم"}
            </h1>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
            {roleLabel} | {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              backgroundColor: isOnline ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              border: `1px solid ${isOnline ? "#22c55e" : "#ef4444"}`,
              color: isOnline ? "#4ade80" : "#fca5a5",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isOnline ? "#22c55e" : "#ef4444",
              }}
            />
            <span>{isOnline ? "النظام متصل" : "أوفلاين"}</span>
          </div>

          {pendingCount > 0 && isOnline && (
            <button
              onClick={syncNow}
              disabled={isSyncing}
              style={{
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isSyncing ? "⏳ مزامنة..." : `🚀 مزامنة (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      {/* قسم الإجراءات السريعة للموبايل */}
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
        ⚡ إجراءات سريعة
      </h2>
      <div className="quick-actions-grid">
        <Link to="/visits" className="quick-action-btn">
          <span className="quick-action-icon">➕</span>
          <span>تسجيل زيارة</span>
        </Link>
        <Link to="/visits" className="quick-action-btn">
          <span className="quick-action-icon">📍</span>
          <span>مشاركة موقع</span>
        </Link>
        <Link to="/visit-plans" className="quick-action-btn">
          <span className="quick-action-icon">📋</span>
          <span>خطة الزيارات</span>
        </Link>
        <Link to="/doctors" className="quick-action-btn">
          <span className="quick-action-icon">🩺</span>
          <span>قائمة الأطباء</span>
        </Link>
        <Link to="/clinics" className="quick-action-btn">
          <span className="quick-action-icon">🏥</span>
          <span>العيادات</span>
        </Link>
        {isAdminOrManager && (
          <Link to="/location-map" className="quick-action-btn">
            <span className="quick-action-icon">🗺</span>
            <span>خريطة المواقع</span>
          </Link>
        )}
      </div>

      {/* قسم المؤشرات والإحصائيات */}
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#334155", marginTop: "24px", marginBottom: "8px" }}>
        📊 ملخص النشاط
      </h2>
      <div className="dashboard-grid">
        <div className="dashboard-card" style={{ borderRight: "4px solid #2563eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>إجمالي الزيارات</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                {visits.length}
              </div>
            </div>
            <div style={{ fontSize: "32px", opacity: 0.8 }}>📅</div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
            زيارات اليوم: <b style={{ color: "#2563eb" }}>{todayVisits.length}</b>
          </div>
        </div>

        <div className="dashboard-card" style={{ borderRight: "4px solid #16a34a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>الأطباء المسجلين</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                {doctors.length}
              </div>
            </div>
            <div style={{ fontSize: "32px", opacity: 0.8 }}>🩺</div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
            العيادات المتاحة: <b style={{ color: "#16a34a" }}>{clinics.length}</b>
          </div>
        </div>

        <div className="dashboard-card" style={{ borderRight: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>خطط CRM</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                {visitPlans.length}
              </div>
            </div>
            <div style={{ fontSize: "32px", opacity: 0.8 }}>📋</div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
            جداول المواعيد المحددة
          </div>
        </div>

        <div className="dashboard-card" style={{ borderRight: `4px solid ${pendingCount > 0 ? "#f59e0b" : "#22c55e"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>حالة المزامنة الأوفلاين</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: pendingCount > 0 ? "#b45309" : "#15803d", marginTop: "4px" }}>
                {pendingCount > 0 ? `${pendingCount} معلق` : "متزامن بالكامل"}
              </div>
            </div>
            <div style={{ fontSize: "32px", opacity: 0.8 }}>{pendingCount > 0 ? "⏳" : "✅"}</div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
            {pendingCount > 0 ? "سيتم الرفع تلقائياً عند الاتصال" : "جميع البيانات متزامنة مع السيرفر"}
          </div>
        </div>
      </div>
    </div>
  );
}
