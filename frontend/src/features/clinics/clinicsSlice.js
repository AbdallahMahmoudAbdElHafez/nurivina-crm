import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';
import {
  setCachedData,
  getCachedData,
  addOrPrependCachedItem,
  addToSyncQueue,
} from '../../utils/indexedDB';

// جلب العيادات مع دعم الكاش المحلي
export const fetchClinics = createAsyncThunk('clinics/fetchClinics', async (_, thunkAPI) => {
  if (navigator.onLine) {
    try {
      const res = await api.get('/clinics');
      await setCachedData('clinics', res.data);
      return res.data;
    } catch (err) {
      const cached = await getCachedData('clinics');
      if (cached && cached.length > 0) return cached;
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  } else {
    const cached = await getCachedData('clinics');
    return cached || [];
  }
});

// إضافة عيادة جديدة
export const addClinic = createAsyncThunk('clinics/addClinic', async (clinic, thunkAPI) => {
  const tempId = `temp_clinic_${Date.now()}`;
  const localClinic = { id: tempId, ...clinic, is_pending_sync: true };

  if (!navigator.onLine) {
    await addOrPrependCachedItem('clinics', localClinic, false);
    await addToSyncQueue({
      type: 'CREATE_CLINIC',
      endpoint: '/clinics',
      method: 'POST',
      payload: clinic,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localClinic;
  }

  try {
    const res = await api.post('/clinics', clinic);
    await addOrPrependCachedItem('clinics', res.data, false);
    return res.data;
  } catch (err) {
    await addOrPrependCachedItem('clinics', localClinic, false);
    await addToSyncQueue({
      type: 'CREATE_CLINIC',
      endpoint: '/clinics',
      method: 'POST',
      payload: clinic,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localClinic;
  }
});

// تحديث عيادة
export const updateClinic = createAsyncThunk('clinics/updateClinic', async ({ id, ...data }, thunkAPI) => {
  try {
    const res = await api.put(`/clinics/${id}`, data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// حذف عيادة
export const deleteClinic = createAsyncThunk('clinics/deleteClinic', async (id, thunkAPI) => {
  try {
    await api.delete(`/clinics/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

const clinicsSlice = createSlice({
  name: 'clinics',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchClinics.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchClinics.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchClinics.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addClinic.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(updateClinic.fulfilled, (state, action) => {
        const index = state.list.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(deleteClinic.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
      });
  },
});

export default clinicsSlice.reducer;
