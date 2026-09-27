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
    await api.delete(`/doctor-users/${selectedUser}/${doctorId}`);
    fetchUserDoctors(selectedUser);
  };

  // ====== واجهة الأدمن والمدير ======
  if (currentUser?.role === "admin" || currentUser?.role === "manager") {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">
          {currentUser.role === "admin"
            ? "إدارة ربط الأطباء بالمستخدمين"
            : "ربط الأطباء بالمندوبين التابعين لي"}
        </h2>

        <div className="flex gap-4 items-center mb-6">
          <select
            value={selectedUser}
            onChange={(e) => {
              setSelectedUser(e.target.value);
              fetchUserDoctors(e.target.value);
            }}
            className="border p-2 rounded"
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
  className="border p-2 rounded"
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
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            إضافة
          </button>
        </div>

        {selectedUser && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              الأطباء المرتبطين بالمستخدم:
            </h3>
            {userDoctors.length === 0 ? (
              <p>لا يوجد أطباء.</p>
            ) : (
              <table className="min-w-[400px] border">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 border">الطبيب</th>
                    <th className="p-2 border">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {userDoctors.map((doc) => (
                    <tr key={doc.id}>
                      <td className="p-2 border">{doc.name}</td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={() => handleRemove(doc.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  }

  // ====== واجهة المندوب ======
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">الأطباء المرتبطين بي</h2>
      {userDoctors.length === 0 ? (
        <p>لا يوجد أطباء.</p>
      ) : (
        <table className="min-w-[400px] border">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">الطبيب</th>
            </tr>
          </thead>
          <tbody>
            {userDoctors.map((doc) => (
              <tr key={doc.id}>
                <td className="p-2 border">{doc.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
