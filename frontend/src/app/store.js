import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice';
import doctorsReducer from '../features/doctors/doctorsSlice';
import citiesReducer from '../features/cities/citiesSlice';
import clinicsReducer from '../features/clinics/clinicsSlice';
import visitPlansReducer from '../features/visitPlans/visitPlansSlice';
import visitsReducer from '../features/visits/visitsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    doctors: doctorsReducer,
    visitPlans: visitPlansReducer,
    cities: citiesReducer,
    clinics: clinicsReducer,
    visits: visitsReducer,

  },
});
