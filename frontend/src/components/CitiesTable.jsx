import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCities,
  addCity,
  updateCity,
  deleteCity,
} from '../features/cities/citiesSlice';
import { MaterialReactTable } from 'material-react-table';

export default function CitiesTable() {
  const dispatch = useDispatch();
  const { list, status, error } = useSelector((state) => state.cities);
  const { user } = useSelector((state) => state.auth);

  const [newName, setNewName] = useState('');

  useEffect(() => {
    dispatch(fetchCities());
  }, [dispatch]);

  const handleAdd = () => {
    if (newName.trim()) {
      dispatch(addCity({ name: newName }));
      setNewName('');
    }
  };

  const handleUpdate = (city) => {
    const newCityName = prompt('ادخل اسم جديد للمدينة:', city.name);
    if (newCityName) {
      dispatch(updateCity({ id: city.id, name: newCityName }));
    }
  };

  const handleDelete = (city) => {
    if (window.confirm(`هل أنت متأكد من حذف ${city.name}؟`)) {
      dispatch(deleteCity(city.id));
    }
  };

  const columns = [
    { accessorKey: 'id', header: 'ID', size: 60 },
    { accessorKey: 'name', header: 'اسم المدينة' },
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
        📍 إدارة المناطق والمدن
      </h2>

      {status === 'loading' && <p style={{ color: '#64748b' }}>جاري التحميل...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {user && (
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
              placeholder="اسم المدينة الجديدة"
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
              + إضافة مدينة
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
