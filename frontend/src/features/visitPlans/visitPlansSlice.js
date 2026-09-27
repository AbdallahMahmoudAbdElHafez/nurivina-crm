import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';
import {
  setCachedData,
  getCachedData,
  addOrPrependCachedItem,
  addToSyncQueue,
} from '../../utils/indexedDB';

// جلب المواعيد والخطط
export const fetchVisitPlans = createAsyncThunk('visit-plans/fetchVisitPlans', async (_, thunkAPI) => {
  if (navigator.onLine) {
    try {
      const res = await api.get('/visit-plans');
      await setCachedData('visitPlans', res.data);
      return res.data;
    } catch (err) {
      const cached = await getCachedData('visitPlans');
      if (cached && cached.length > 0) return cached;
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  } else {
    const cached = await getCachedData('visitPlans');
    return cached || [];
  }
});

// إضافة موعد/خطة جديدة
export const addVisitPlan = createAsyncThunk('visit-plans/addVisitPlan', async (visitPlan, thunkAPI) => {
  const tempId = `temp_plan_${Date.now()}`;
  const localPlan = { id: tempId, ...visitPlan, is_pending_sync: true };

  if (!navigator.onLine) {
    await addOrPrependCachedItem('visitPlans', localPlan, false);
    await addToSyncQueue({
      type: 'CREATE_PLAN',
      endpoint: '/visit-plans',
      method: 'POST',
      payload: visitPlan,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localPlan;
  }

  try {
    const res = await api.post('/visit-plans', visitPlan);
    await addOrPrependCachedItem('visitPlans', res.data, false);
    return res.data;
  } catch (err) {
    await addOrPrependCachedItem('visitPlans', localPlan, false);
    await addToSyncQueue({
      type: 'CREATE_PLAN',
      endpoint: '/visit-plans',
      method: 'POST',
      payload: visitPlan,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localPlan;
  }
});

// تحديث موعد
export const updateVisitPlan = createAsyncThunk('visit-plans/updateVisitPlan', async ({ id, ...data }, thunkAPI) => {
  try {
    const res = await api.put(`/visit-plans/${id}`, data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// حذف موعد
export const deleteVisitPlan = createAsyncThunk('visit-plans/deleteVisitPlan', async (id, thunkAPI) => {
  try {
    await api.delete(`/visit-plans/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

const visitsSlice = createSlice({
  name: 'visitPlans',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchVisitPlans.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchVisitPlans.fulfilled, (state, action) => { state.list = action.payload; state.status = 'succeeded'; })
      .addCase(fetchVisitPlans.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(addVisitPlan.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(updateVisitPlan.fulfilled, (state, action) => {
        const index = state.list.findIndex(v => v.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(deleteVisitPlan.fulfilled, (state, action) => {
        state.list = state.list.filter(v => v.id !== action.payload);
      });
  },
});

export default visitsSlice.reducer;
