import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9003/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth routes that should NOT trigger token refresh on 401
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/refresh'];

function isAuthRoute(url?: string): boolean {
  if (!url) return false;
  return AUTH_ROUTES.some((route) => url.includes(route));
}

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken') || localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and auto-refresh (skip for auth routes)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't intercept auth route errors - let them pass through to the caller
    if (isAuthRoute(originalRequest?.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken } = response.data.data;

        Cookies.set('accessToken', accessToken, { expires: 1 });
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Only redirect if we're actually inside a protected page.  If the
        // user is already on /login (or any /auth-* page), don't reload —
        // it produces a flash loop that looks like "the home keeps going
        // to login" even after they sign in.
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const isAuthPage = path === '/login' || path.startsWith('/auth') || path === '/';
          if (!isAuthPage) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
