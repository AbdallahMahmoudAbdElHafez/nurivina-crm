import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';

export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const res = await api.get('/users');
  return res.data;
});

const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => { state.list = action.payload; state.status = 'succeeded'; })
      .addCase(fetchUsers.rejected, (state, action) => { state.error = action.error.message; state.status = 'failed'; })
      .addCase(fetchUsers.pending, (state) => { state.status = 'loading'; });
  }
});

export default usersSlice.reducer;

