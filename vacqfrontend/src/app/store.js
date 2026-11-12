import { configureStore } from '@reduxjs/toolkit';
import authReducer, { sessionExpired } from '../features/auth/authSlice';
import { setSessionExpiredHandler } from './api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

setSessionExpiredHandler(() => store.dispatch(sessionExpired()));
