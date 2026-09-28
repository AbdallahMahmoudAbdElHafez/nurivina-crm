
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';

export const login = createAsyncThunk('auth/login', async (creds, thunkAPI) => {
  try {
    const res = await api.post('/auth/login', creds);
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'فشل تسجيل الدخول';
    return thunkAPI.rejectWithValue(msg);
  }
});

export const register = createAsyncThunk('auth/register', async (data, thunkAPI) => {
  try {
    const res = await api.post('/auth/register', data);
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'فشل التسجيل';
    return thunkAPI.rejectWithValue(msg);
  }
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
      state.error = action.payload || action.error.message || 'فشل تسجيل الدخول';
      state.status = 'failed';
    })
    .addCase(register.fulfilled, (state, action) => {
      state.user = action.payload;
      state.status = 'succeeded';
      state.error = null;
    })
    .addCase(register.rejected, (state, action) => {
      state.error = action.payload || action.error.message || 'فشل التسجيل';
      state.status = 'failed';
    });
}

});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
