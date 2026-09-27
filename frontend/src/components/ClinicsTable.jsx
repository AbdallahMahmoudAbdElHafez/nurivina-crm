import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialReactTable } from 'material-react-table';
import {
  fetchClinics,
  addClinic,
  updateClinic,
  deleteClinic,
} from '../features/clinics/clinicsSlice';
import { fetchCities } from '../features/cities/citiesSlice';

export default function ClinicsTable() {
  const dispatch = useDispatch();
  const { list, status, error } = useSelector((state) => state.clinics);
  const { list: cities } = useSelector((state) => state.cities);
  const { user } = useSelector((state) => state.auth);

  const [newClinic, setNewClinic] = useState({
    clinic_name: '',
    address: '',
    city_id: '',
    clinic_phone: '',
  });

  useEffect(() => {
    dispatch(fetchClinics());
    dispatch(fetchCities());
  }, [dispatch]);

  const handleAdd = () => {
    if (newClinic.clinic_name.trim()) {
      dispatch(addClinic(newClinic));
      setNewClinic({ clinic_name: '', address: '', city_id: '', clinic_phone: '' });
    }
  };

  const handleUpdate = (clinic) => {
    const clinic_name = prompt('اسم العيادة:', clinic.clinic_name) || clinic.clinic_name;
    const address = prompt('العنوان:', clinic.address) || clinic.address;
    const clinic_phone = prompt('الهاتف:', clinic.clinic_phone) || clinic.clinic_phone;
    const city_id = prompt('City ID:', clinic.city_id) || clinic.city_id;
    dispatch(updateClinic({ id: clinic.id, clinic_name, address, clinic_phone, city_id }));
  };

  const handleDelete = (clinic) => {
    if (window.confirm(`هل أنت متأكد من حذف ${clinic.clinic_name}؟`)) {
      dispatch(deleteClinic(clinic.id));
    }
  };

  const columns = [
    { accessorKey: 'id', header: 'ID', size: 60 },
    { accessorKey: 'clinic_name', header: 'اسم العيادة' },
    { accessorKey: 'address', header: 'العنوان' },
    { accessorKey: 'clinic_phone', header: 'الهاتف' },
    {
      accessorKey: 'city',
      header: 'المدينة',
      Cell: ({ row }) => row.original.city?.name || 'غير محددة',
    },
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
        🏥 إدارة العيادات
      </h2>

      {status === 'loading' && <p style={{ color: '#64748b' }}>جاري التحميل...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {user && (
        <div
          style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px', color: '#334155' }}>
            إضافة عيادة جديدة
          </div>
          <div className="responsive-form-row">
            <input
              type="text"
              placeholder="اسم العيادة"
              value={newClinic.clinic_name}
              onChange={(e) => setNewClinic({ ...newClinic, clinic_name: e.target.value })}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
            <input
              type="text"
              placeholder="العنوان"
              value={newClinic.address}
              onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
            <input
              type="text"
              placeholder="الهاتف"
              value={newClinic.clinic_phone}
              onChange={(e) => setNewClinic({ ...newClinic, clinic_phone: e.target.value })}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
            <select
              value={newClinic.city_id}
              onChange={(e) => setNewClinic({ ...newClinic, city_id: e.target.value })}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: '#fff',
              }}
            >
              <option value="">اختر المدينة</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              style={{
                padding: '9px 18px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              + إضافة عيادة
            </button>
          </div>
        </div>
      )}

      <div className="table-responsive-container">
        <MaterialReactTable
          columns={columns}
          data={list || []}
          initialState={{ density: 'compact' }}
          enableRowActions={user?.role === 'admin'}
          renderRowActions={({ row }) =>
            user?.role === 'admin' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleUpdate(row.original)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 8px',
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
                    padding: '4px 8px',
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
