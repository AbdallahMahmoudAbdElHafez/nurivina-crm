import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/apiClient';
import {
  setCachedData,
  getCachedData,
  addOrPrependCachedItem,
  addToSyncQueue,
} from '../../utils/indexedDB';

// جلب المدن مع دعم الكاش المحلي
export const fetchCities = createAsyncThunk('cities/fetchCities', async (_, thunkAPI) => {
  if (navigator.onLine) {
    try {
      const res = await api.get('/cities');
      await setCachedData('cities', res.data);
      return res.data;
    } catch (err) {
      const cached = await getCachedData('cities');
      if (cached && cached.length > 0) return cached;
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  } else {
    const cached = await getCachedData('cities');
    return cached || [];
  }
});

// إضافة مدينة
export const addCity = createAsyncThunk('cities/addCity', async (city, thunkAPI) => {
  const tempId = `temp_city_${Date.now()}`;
  const localCity = { id: tempId, ...city, is_pending_sync: true };

  if (!navigator.onLine) {
    await addOrPrependCachedItem('cities', localCity, false);
    await addToSyncQueue({
      type: 'CREATE_CITY',
      endpoint: '/cities',
      method: 'POST',
      payload: city,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localCity;
  }

  try {
    const res = await api.post('/cities', city);
    await addOrPrependCachedItem('cities', res.data, false);
    return res.data;
  } catch (err) {
    await addOrPrependCachedItem('cities', localCity, false);
    await addToSyncQueue({
      type: 'CREATE_CITY',
      endpoint: '/cities',
      method: 'POST',
      payload: city,
      tempId,
    });
    window.dispatchEvent(new CustomEvent('crm_queue_updated'));
    return localCity;
  }
});

// تحديث مدينة
export const updateCity = createAsyncThunk('cities/updateCity', async ({ id, name }, thunkAPI) => {
  try {
    const res = await api.put(`/cities/${id}`, { name });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

// حذف مدينة
export const deleteCity = createAsyncThunk('cities/deleteCity', async (id, thunkAPI) => {
  try {
    await api.delete(`/cities/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
  }
});

const citiesSlice = createSlice({
  name: 'cities',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchCities.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addCity.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateCity.fulfilled, (state, action) => {
        const index = state.list.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(deleteCity.fulfilled, (state, action) => {
        state.list = state.list.filter((c) => c.id !== action.payload);
      });
  },
});

export default citiesSlice.reducer;
