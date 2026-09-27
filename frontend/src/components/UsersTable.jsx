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
} from '@mui/material';

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
    { accessorKey: 'user_id', header: 'ID' },
    { accessorKey: 'full_name', header: 'الاسم الكامل' },
    { accessorKey: 'role', header: 'الدور' },
    {
      accessorFn: (row) => row.manager?.full_name || '-',
      id: 'manager_name',
      header: 'المدير',
    },
  ];

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">إدارة المستخدمين</h2>

      {currentUser?.role === 'admin' && (
        <button
          onClick={handleAdd}
          className="mb-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + إضافة مستخدم
        </button>
      )}

      <MaterialReactTable
        columns={columns}
        data={users || []}
        state={{ isLoading: status === 'loading' }}
        enableRowActions={currentUser?.role === 'admin'}
        renderRowActions={({ row }) =>
          currentUser?.role === 'admin' ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(row)}
                className="bg-blue-500 text-white px-2 py-1 rounded"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDelete(row.original.user_id)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                حذف
              </button>
            </div>
          ) : null
        }
        initialState={{ density: 'compact' }}
      />

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
    if (user)
      await api.put(`/users/${user.user_id}`, form);
    else
      await api.post('/users', form);
    onSaved();
  };

  const managers = allUsers.filter(
    (u) => u.role === 'manager' || u.role === 'admin'
  );

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{user ? 'تعديل المستخدم' : 'إضافة مستخدم'}</DialogTitle>
      <DialogContent>
        <div className="flex flex-col gap-3 mt-2 w-80">
          <TextField
            label="الاسم الكامل"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            fullWidth
          />
          {!user && (
            <TextField
              label="كلمة المرور"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
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
            <MenuItem value="rep">ممثل</MenuItem>
            <MenuItem value="manager">مدير</MenuItem>
            <MenuItem value="admin">أدمن</MenuItem>
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
                {m.full_name}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={handleSubmit} variant="contained" color="success">
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
