import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';
import {
  setCachedData,
  getCachedData,
  addOrPrependCachedItem,
  addToSyncQueue,
} from '../../utils/indexedDB';

// جلب الأطباء مع دعم الكاش المحلي
export const fetchDoctors = createAsyncThunk('doctors/fetchDoctors', async (_, thunkAPI) => {
  if (navigator.onLine) {
    try {
      const res = await api.get('/doctors');
      await setCachedData('doctors', res.data);
      return res.data;
    } catch (err) {
      const cached = await getCachedData('doctors');
      if (cached && cached.length > 0) return cached;
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  } else {
    const cached = await getCachedData('doctors');
    return cached || [];
  }
});

// إضافة طبيب جديد مع دعم الحفظ المحلي أوفلاين
export const addDoctor = createAsyncThunk('doctors/addDoctor', async (doctor, thunkAPI) => {
  const tempId = `temp_doc_${Date.now()}`;
  const localDoc = { id: tempId, ...doctor, is_pending_sync: true };

  if (!navigator.onLine) {
    await addOrPrependCachedItem('doctors', localDoc, false);
    await addToSyncQueue({
      type: 'CREATE_DOCTOR',
      endpoint: '/doctors',
      method: 'POST',
      payload: doctor,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localDoc;
  }

  try {
    const res = await api.post('/doctors', doctor);
    await addOrPrependCachedItem('doctors', res.data, false);
    return res.data;
  } catch (err) {
    await addOrPrependCachedItem('doctors', localDoc, false);
    await addToSyncQueue({
      type: 'CREATE_DOCTOR',
      endpoint: '/doctors',
      method: 'POST',
      payload: doctor,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localDoc;
  }
});

// تحديث طبيب
export const updateDoctor = createAsyncThunk('doctors/updateDoctor', async ({ id, name }, thunkAPI) => {
  try {
    const res = await api.put(`/doctors/${id}`, { name });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// حذف طبيب
export const deleteDoctor = createAsyncThunk('doctors/deleteDoctor', async (id, thunkAPI) => {
  try {
    await api.delete(`/doctors/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchDoctors.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addDoctor.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateDoctor.fulfilled, (state, action) => {
        const index = state.list.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(deleteDoctor.fulfilled, (state, action) => {
        state.list = state.list.filter((d) => d.id !== action.payload);
      });
  },
});

export default doctorsSlice.reducer;
