import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDoctors,
  addDoctor,
  updateDoctor,
  deleteDoctor,
} from '../features/doctors/doctorsSlice';
import { MaterialReactTable } from 'material-react-table';
import api from '../api/apiClient';

export default function DoctorsTable() {
  const dispatch = useDispatch();
  const { list, status, error } = useSelector((state) => state.doctors);
  const { user } = useSelector((state) => state.auth);

  const [newName, setNewName] = useState('');
  const [localDoctors, setLocalDoctors] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      dispatch(fetchDoctors());
    } else {
      fetchMyDoctors();
    }
  }, [dispatch, user]);

  const fetchMyDoctors = async () => {
    try {
      const res = await api.get('/doctors/my-doctors');
      setLocalDoctors(res.data);
    } catch (err) {
      console.warn('Error fetching my doctors, using cached doctors:', err);
      dispatch(fetchDoctors());
    }
  };

  const handleAdd = () => {
    if (newName.trim()) {
      dispatch(addDoctor({ name: newName }));
      setNewName('');
    }
  };

  const handleUpdate = (doctor) => {
    const newDoctorName = prompt('ادخل اسم جديد للطبيب:', doctor.name);
    if (newDoctorName) {
      dispatch(updateDoctor({ id: doctor.id, name: newDoctorName }));
    }
  };

  const handleDelete = (doctor) => {
    if (window.confirm(`هل أنت متأكد من حذف ${doctor.name}؟`)) {
      dispatch(deleteDoctor(doctor.id));
    }
  };

  const columns = [
    { accessorKey: 'id', header: 'ID', size: 60 },
    { accessorKey: 'name', header: 'اسم الطبيب' },
    {
      id: 'sync_status',
      header: 'الحالة',
      size: 100,
      Cell: ({ row }) => {
        const isTemp = String(row.original.id).startsWith('temp_');
        return isTemp ? (
          <span className="badge-status badge-pending">⏳ محلي</span>
        ) : (
          <span className="badge-status badge-synced">✅ متزامن</span>
        );
      },
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
        🩺 إدارة الأطباء
      </h2>

      {status === 'loading' && <p style={{ color: '#64748b' }}>جاري التحميل...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {(user?.role === 'admin' || user?.role === 'manager') && (
        <div
          style={{
            background: '#ffffff',
            padding: '12px 14px',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: '14px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div className="responsive-form-row" style={{ marginBottom: 0 }}>
            <input
              type="text"
              placeholder="اسم الطبيب الجديد"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ flex: '1 1 200px' }}
            />
            <button
              onClick={handleAdd}
              style={{
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                padding: '0 16px',
              }}
            >
              + إضافة طبيب
            </button>
          </div>
        </div>
      )}

      <div className="table-responsive-container">
        <MaterialReactTable
          columns={columns}
          data={user?.role === 'admin' ? list : localDoctors.length > 0 ? localDoctors : list}
          enableRowActions={user?.role === 'admin'}
          initialState={{ density: 'compact' }}
          renderRowActions={({ row }) =>
            user?.role === 'admin' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleUpdate(row.original)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(row.original)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  حذف
                </button>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
