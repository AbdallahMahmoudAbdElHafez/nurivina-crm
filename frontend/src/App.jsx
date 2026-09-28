import React, { useState, useEffect } from "react";
import useOfflineSync from "./hooks/useOfflineSync";
import { Provider, useSelector } from "react-redux";
import { store } from "./app/store";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UsersTable from "./components/UsersTable";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import DoctorsTable from "./components/DoctorsTable";
import CitiesTable from "./components/CitiesTable";
import ClinicsTable from "./components/ClinicsTable";
import HomePage from "./pages/HomePage";
import VisitPlansTable from "./components/VisitPlansTable";
import VisitTable from "./components/VisitTable";
import DoctorUserManager from "./components/DoctorUserManager";
import ManagerOrAdminRoute from "./components/ManagerOrAdminRoute";
import LocationMapPage from "./pages/LocationMapPage";

function MainLayout() {
  useOfflineSync(); // مزامنة تلقائية للبيانات والمواقع المحفوظة offline

  const { token } = useSelector((s) => s.auth);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const SIDEBAR_WIDTH = 240;

  const contentWrapperStyle = {
    marginRight: token && !isMobile ? SIDEBAR_WIDTH : 0,
    marginLeft: 0,
    minHeight: "100vh",
    background: "#f8fafc",
    boxSizing: "border-box",
    transition: "margin-right 0.3s ease",
  };

  return (
    <BrowserRouter>
      {token && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
        />
      )}
      <div style={contentWrapperStyle}>
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isMobile={isMobile}
        />
        <main
          className="main-content-area"
          style={{
            padding: isMobile ? "12px 12px" : "20px 24px",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          {/* شريط تنبيه العمل بدون إنترنت والمزامنة */}
          <OfflineBanner />

          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <AdminRoute>
                  <RegisterPage />
                </AdminRoute>
              }
            />
            <Route
              path="/doctor-user-manager"
              element={
                <ManagerOrAdminRoute>
                  <DoctorUserManager />
                </ManagerOrAdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UsersTable />
                </ProtectedRoute>
              }
            />
            <Route path="/doctors" element={<DoctorsTable />} />
            <Route
              path="/cities"
              element={
                <ProtectedRoute>
                  <CitiesTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinics"
              element={
                <ProtectedRoute>
                  <ClinicsTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/visit-plans"
              element={
                <ProtectedRoute>
                  <VisitPlansTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/visits"
              element={
                <ProtectedRoute>
                  <VisitTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-map"
              element={
                <ManagerOrAdminRoute>
                  <LocationMapPage />
                </ManagerOrAdminRoute>
              }
            />
          </Routes>
        </main>
      </div>

      {/* شريط التنقل السفلي السريع للهواتف */}
      {token && <BottomNav />}
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <MainLayout />
    </Provider>
  );
}

export default App;
