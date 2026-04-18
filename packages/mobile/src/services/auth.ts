import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { STORAGE_KEYS } from '../utils/constants';
import {
  LoginResponse,
  OtpVerifyResponse,
  UserProfile,
} from '../types';

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await api.post('/auth/login', { email, password });
  const result = response.data; // { success, data: { user, accessToken, ... } }
  const payload = result.data; // the nested data object

  if (result.success && payload && !payload.requiresOtp) {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, payload.refreshToken);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(payload.user),
    );
    return { success: true, user: payload.user };
  }

  if (result.success && payload?.requiresOtp) {
    return { success: true, otpRequired: true, tempToken: payload.userId };
  }

  return { success: false, message: result.error || 'Login failed' };
}

export async function verifyOtp(
  userId: string,
  otp: string,
): Promise<OtpVerifyResponse> {
  const response = await api.post('/auth/verify-otp', {
    userId,
    code: otp,
  });
  const result = response.data;
  const payload = result.data;

  if (result.success && payload) {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, payload.refreshToken);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(payload.user),
    );
    return { success: true, user: payload.user };
  }

  return { success: false, message: result.error || 'OTP verification failed' };
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Ignore logout API errors
  } finally {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  }
}

export async function getStoredUser(): Promise<UserProfile | null> {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredToken();
  return !!token;
}
