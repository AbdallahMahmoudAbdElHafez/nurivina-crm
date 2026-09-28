import React, { useEffect, useState } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../features/users/usersSlice';
import api from '../api/apiClient';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  IconButton,
} from '@mui/material';
import { Delete, Edit, PersonAdd } from '@mui/icons-material';

export default function UsersTable() {
  const dispatch = useDispatch();
  const users = useSelector((state) => state.users.list);
  const status = useSelector((state) => state.users.status);
  const currentUser = useSelector((state) => state.auth.user);

  const [openForm, setOpenForm] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const columns = [
    { accessorKey: 'user_id', header: 'ID', size: 60 },
    { accessorKey: 'full_name', header: 'الاسم الكامل' },
    {
      accessorKey: 'role',
      header: 'الدور',
      size: 100,
      Cell: ({ row }) => {
        const r = row.original.role;
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: r === 'admin' ? '#fee2e2' : r === 'manager' ? '#eff6ff' : '#f1f5f9',
              color: r === 'admin' ? '#991b1b' : r === 'manager' ? '#1e40af' : '#334155',
            }}
          >
            {r === 'admin' ? 'أدمن' : r === 'manager' ? 'مدير' : 'مندوب'}
          </span>
        );
      },
    },
    {
      accessorFn: (row) => row.manager?.full_name || '—',
      id: 'manager_name',
      header: 'المدير المباشر',
    },
  ];

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await api.delete(`/users/${id}`);
    dispatch(fetchUsers());
  };

  const handleEdit = (row) => {
    setEditUser(row.original);
    setOpenForm(true);
  };

  const handleAdd = () => {
    setEditUser(null);
    setOpenForm(true);
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
          👥 إدارة المستخدمين
        </h2>

        {currentUser?.role === 'admin' && (
          <button
            onClick={handleAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            <span>+</span>
            <span>إضافة مستخدم</span>
          </button>
        )}
      </div>

      <div className="table-responsive-container">
        <MaterialReactTable
          columns={columns}
          data={users || []}
          state={{ isLoading: status === 'loading' }}
          enableRowActions={currentUser?.role === 'admin'}
          renderRowActions={({ row }) =>
            currentUser?.role === 'admin' ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <IconButton color="primary" size="small" onClick={() => handleEdit(row)}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton color="error" size="small" onClick={() => handleDelete(row.original.user_id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </div>
            ) : null
          }
          initialState={{ density: 'compact' }}
        />
      </div>

      <UserDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        user={editUser}
        allUsers={users}
        onSaved={() => {
          setOpenForm(false);
          dispatch(fetchUsers());
        }}
      />
    </div>
  );
}

function UserDialog({ open, onClose, user, onSaved, allUsers }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    role: user?.role || 'rep',
    password: '',
    manager_id: user?.manager_id || '',
  });

  useEffect(() => {
    setForm({
      full_name: user?.full_name || '',
      role: user?.role || 'rep',
      password: '',
      manager_id: user?.manager_id || '',
    });
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.full_name) return alert('أدخل الاسم الكامل');
    if (user) {
      await api.put(`/users/${user.user_id}`, form);
    } else {
      if (!form.password) return alert('أدخل كلمة المرور');
      await api.post('/users', form);
    }
    onSaved();
  };

  const managers = (allUsers || []).filter(
    (u) => u.role === 'manager' || u.role === 'admin'
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle style={{ fontWeight: 700 }}>
        {user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="الاسم الكامل"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            fullWidth
            required
          />
          {!user && (
            <TextField
              label="كلمة المرور"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              required
            />
          )}
          <TextField
            select
            label="الدور"
            name="role"
            value={form.role}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="rep">مندوب (Rep)</MenuItem>
            <MenuItem value="manager">مدير (Manager)</MenuItem>
            <MenuItem value="admin">مدير نظام (Admin)</MenuItem>
          </TextField>
          <TextField
            select
            label="المدير المباشر"
            name="manager_id"
            value={form.manager_id}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="">بدون مدير</MenuItem>
            {managers.map((m) => (
              <MenuItem key={m.user_id} value={m.user_id}>
                {m.full_name} ({m.role})
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions style={{ padding: '12px 24px' }}>
        <Button onClick={onClose} color="inherit">إلغاء</Button>
        <Button onClick={handleSubmit} variant="contained" color="success">
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
