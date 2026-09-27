
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';

export const login = createAsyncThunk('auth/login', async (creds, thunkAPI) => {
  const res = await api.post('/auth/login', creds);
  console.log(res.data);
  return res.data;
});

export const register = createAsyncThunk('auth/register', async (data) => {
  const res = await api.post('/auth/register', data);
  return res.data;
});

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  status: 'idle',
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null; 
      state.token = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('token'); 
      localStorage.removeItem('user');
    }
  },
extraReducers(builder) {
  builder
    .addCase(login.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      state.status = 'succeeded';
      state.error = null;
    })
    .addCase(login.rejected, (state, action) => {
      state.error = action.error.message || 'فشل تسجيل الدخول';
      state.status = 'failed';
    })
    .addCase(register.fulfilled, (state, action) => {
      state.user = action.payload;
      state.status = 'succeeded';
      state.error = null;
    })
    .addCase(register.rejected, (state, action) => {
      state.error = action.error.message || 'فشل التسجيل';
      state.status = 'failed';
    });
}

});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
