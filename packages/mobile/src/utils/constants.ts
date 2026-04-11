export const API_URL = 'http://192.168.1.17:9003/api';
export const SOCKET_URL = 'http://192.168.1.17:9003';
export const IMAGEKIT_PUBLIC_KEY = 'public_Lve3HzTkm0sFK1RfoosMkz+yDMk=';
export const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/aiwats';

export const SLOT_TIMES = [
  { key: '09:00', label: '9:00 AM', start: 9, end: 11 },
  { key: '11:00', label: '11:00 AM', start: 11, end: 13 },
  { key: '13:00', label: '1:00 PM', start: 13, end: 15 },
  { key: '15:00', label: '3:00 PM', start: 15, end: 17 },
  { key: '17:00', label: '5:00 PM', start: 17, end: 19 },
] as const;

export const CHECK_IN_RADIUS_METERS = 200;

export const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#dbeafe',
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  background: '#f3f4f6',
  white: '#ffffff',
  black: '#111827',
  grey100: '#f3f4f6',
  grey200: '#e5e7eb',
  grey300: '#d1d5db',
  grey400: '#9ca3af',
  grey500: '#6b7280',
  grey600: '#4b5563',
  grey700: '#374151',
  grey800: '#1f2937',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth_access_token',
  REFRESH_TOKEN: '@auth_refresh_token',
  USER_DATA: '@auth_user_data',
  OFFLINE_QUEUE: '@offline_queue',
  BOOTH_DATA: '@booth_data',
};
