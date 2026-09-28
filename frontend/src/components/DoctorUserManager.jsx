import React, { useEffect, useState } from "react";
import api from "../api/apiClient";

export default function DoctorUserManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [userDoctors, setUserDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) initData();
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("خطأ في جلب المستخدم:", err);
    }
  };

  const initData = async () => {
    if (currentUser.role === "admin") {
      await fetchUsers();
      await fetchDoctors();
    } else if (currentUser.role === "manager") {
      await fetchManagedUsers();
      await fetchMyDoctors();
    } else {
      await fetchUserDoctorsMe();
    }
  };

  const fetchUsers = async () => {
    const res = await api.get("/users");
    setUsers(res.data.filter((u) => u.role !== "admin"));
  };

  const fetchManagedUsers = async () => {
    const res = await api.get("/users");
    setUsers(res.data.filter((u) => u.manager_id === currentUser.user_id));
  };

  const fetchDoctors = async () => {
    const res = await api.get("/doctors");
    setDoctors(res.data);
  };

  const fetchMyDoctors = async () => {
    try {
      let res;
      if (currentUser.role === "admin") {
        res = await api.get("/doctors");
      } else {
        res = await api.get("/doctor-users/me");
      }
      setDoctors(res.data);
    } catch (err) {
      console.error("خطأ في جلب الأطباء:", err);
    }
  };

  const fetchUserDoctors = async (userId) => {
    const res = await api.get(`/doctor-users/${userId}`);
    setUserDoctors(res.data);
  };

  const fetchUserDoctorsMe = async () => {
    const res = await api.get("/doctor-users/me");
    setUserDoctors(res.data);
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedDoctor)
      return alert("اختر المستخدم والطبيب");
    await api.post("/doctor-users", {
      user_id: selectedUser,
      doctor_id: selectedDoctor,
    });
    fetchUserDoctors(selectedUser);
    setSelectedDoctor("");
  };

  const handleRemove = async (doctorId) => {
    if (!window.confirm("هل أنت متأكد من فك ربط الطبيب؟")) return;
    await api.delete(`/doctor-users/${selectedUser}/${doctorId}`);
    fetchUserDoctors(selectedUser);
  };

  // ====== واجهة الأدمن والمدير ======
  if (currentUser?.role === "admin" || currentUser?.role === "manager") {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px", color: "#1e293b" }}>
          {currentUser.role === "admin"
            ? "🔗 إدارة ربط الأطباء بالمستخدمين"
            : "🔗 ربط الأطباء بالمندوبين التابعين لي"}
        </h2>

        <div
          style={{
            background: "#ffffff",
            padding: "12px 14px",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            marginBottom: "14px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#334155" }}>
            إضافة طبيب لمندوب
          </div>
          <div className="responsive-form-row">
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                if (e.target.value) fetchUserDoctors(e.target.value);
                else setUserDoctors([]);
              }}
            >
              <option value="">اختر المستخدم</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>

            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="">اختر الطبيب</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleAssign}
              className="form-btn-full"
              style={{
                backgroundColor: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              + ربط الطبيب
            </button>
          </div>
        </div>

        {selectedUser && (
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "#0f172a" }}>
              الأطباء المرتبطين بالمستخدم ({userDoctors.length}):
            </h3>
            {userDoctors.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "14px" }}>لا يوجد أطباء مرتبطين بهذا المستخدم حتى الآن.</p>
            ) : (
              <div className="table-responsive-container">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 14px", fontSize: "13px", color: "#475569" }}>اسم الطبيب</th>
                      <th style={{ padding: "10px 14px", fontSize: "13px", color: "#475569", width: "100px", textAlign: "center" }}>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDoctors.map((doc) => (
                      <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontSize: "14px", fontWeight: 500 }}>{doc.name}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <button
                            onClick={() => handleRemove(doc.id)}
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            فك الربط
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ====== واجهة المندوب ======
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px", color: "#1e293b" }}>
        🩺 الأطباء المرتبطين بي
      </h2>
      {userDoctors.length === 0 ? (
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", textAlign: "center", color: "#64748b" }}>
          لا يوجد أطباء مرتبطين بك حالياً.
        </div>
      ) : (
        <div className="table-responsive-container">
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 14px", fontSize: "13px", color: "#475569" }}>اسم الطبيب</th>
              </tr>
            </thead>
            <tbody>
              {userDoctors.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 500 }}>{doc.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
