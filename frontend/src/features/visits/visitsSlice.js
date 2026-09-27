// src/features/visits/visitsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';
import {
  setCachedData,
  getCachedData,
  addOrPrependCachedItem,
  addToSyncQueue,
} from '../../utils/indexedDB';
import syncEngine from '../../utils/syncEngine';

// جلب الزيارات مع دعم الكاش المحلي عند انقطاع الإنترنت
export const fetchVisits = createAsyncThunk('visits/fetchAll', async (_, { rejectWithValue }) => {
  if (navigator.onLine) {
    try {
      const res = await api.get('/visits');
      // حفظ نسخة في كاش IndexedDB
      await setCachedData('visits', res.data);
      return res.data;
    } catch (err) {
      console.warn('تعذر جلب الزيارات من السيرفر، محاولة قراءة الكاش المحلي:', err.message);
      const cached = await getCachedData('visits');
      if (cached && cached.length > 0) {
        return cached;
      }
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  } else {
    // أوفلاين: قراءة مباشرة من IndexedDB
    const cached = await getCachedData('visits');
    return cached || [];
  }
});

// إضافة زيارة جديدة: فورية ومحلية عند انقطاع النت مع وضعها في طابور المزامنة
export const addVisit = createAsyncThunk('visits/add', async (data, thunkAPI) => {
  const state = thunkAPI.getState();
  const currentUser = state.auth.user || { full_name: 'أنا' };
  const doctor = state.doctors?.list?.find((d) => String(d.id) === String(data.doctor_id)) || {
    name: 'طبيب',
  };
  const clinic = state.clinics?.list?.find((c) => String(c.id) === String(data.clinic_id)) || {
    clinic_name: 'عيادة',
  };

  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const localVisit = {
    visit_id: tempId,
    ...data,
    user: currentUser,
    doctor,
    clinic,
    is_pending_sync: true,
    created_at: new Date().toISOString(),
  };

  if (!navigator.onLine) {
    // 1. حفظ في الكاش المحلي
    await addOrPrependCachedItem('visits', localVisit);
    // 2. إضافة لطابور المزامنة
    await addToSyncQueue({
      type: 'CREATE_VISIT',
      endpoint: '/visits',
      method: 'POST',
      payload: data,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localVisit;
  }

  try {
    const res = await api.post('/visits', data);
    const created = res.data.visit || res.data;
    // إضافة الكائن الجديد للكاش
    await addOrPrependCachedItem('visits', { ...created, user: currentUser, doctor, clinic });
    return created;
  } catch (err) {
    console.warn('فشل إرسال الزيارة للسيرفر، جاري حفظها محلياً في طابور المزامنة:', err.message);
    await addOrPrependCachedItem('visits', localVisit);
    await addToSyncQueue({
      type: 'CREATE_VISIT',
      endpoint: '/visits',
      method: 'POST',
      payload: data,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localVisit;
  }
});

export const updateVisit = createAsyncThunk('visits/update', async ({ id, data }) => {
  const res = await api.put(`/visits/${id}`, data);
  return res.data.visit;
});

export const deleteVisit = createAsyncThunk('visits/delete', async (id) => {
  await api.delete(`/visits/${id}`);
  return id;
});

const visitsSlice = createSlice({
  name: 'visits',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {
    // تحديث زيارة في الحالة مباشرة (مثل تسجيل الموقع أوفلاين)
    updateVisitLocally(state, action) {
      const { visitId, fields } = action.payload;
      const idx = state.list.findIndex((v) => String(v.visit_id) === String(visitId));
      if (idx >= 0) {
        state.list[idx] = { ...state.list[idx], ...fields };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisits.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchVisits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchVisits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addVisit.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(updateVisit.fulfilled, (state, action) => {
        const idx = state.list.findIndex((v) => v.visit_id === action.payload.visit_id);
        if (idx >= 0) state.list[idx] = action.payload;
      })
      .addCase(deleteVisit.fulfilled, (state, action) => {
        state.list = state.list.filter((v) => v.visit_id !== action.payload);
      });
  },
});

export const { updateVisitLocally } = visitsSlice.actions;
export default visitsSlice.reducer;
