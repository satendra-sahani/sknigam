import api from './api';
import Cookies from 'js-cookie';
import { disconnectSocket } from './socket';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface OtpVerification {
  userId: string;
  code: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  assemblyConstituency?: string;
  district?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface LoginResponse {
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  requiresOtp?: boolean;
  userId?: string;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await api.post('/auth/login', credentials);
  const data = response.data.data as LoginResponse;

  if (data.accessToken && data.refreshToken && data.user) {
    storeTokens(data.accessToken, data.refreshToken);
    storeUser(data.user);
  }

  return data;
}

export async function verifyOtp(otpData: OtpVerification): Promise<LoginResponse> {
  const response = await api.post('/auth/verify-otp', otpData);
  const data = response.data.data as LoginResponse;

  if (data.accessToken && data.refreshToken && data.user) {
    storeTokens(data.accessToken, data.refreshToken);
    storeUser(data.user);
  }

  return data;
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
    await api.post('/auth/logout', { refreshToken });
  } catch {
    // Ignore logout errors
  } finally {
    clearAuth();
    disconnectSocket();
  }
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  Cookies.set('accessToken', accessToken, { expires: 1 });
  Cookies.set('refreshToken', refreshToken, { expires: 7 });
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function storeUser(user: AuthUser): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return Cookies.get('accessToken') || localStorage.getItem('accessToken') || null;
}

export function clearAuth(): void {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function getTokenExpiry(): number | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
