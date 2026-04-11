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

export const CAST_OPTIONS = [
  { key: 'general', label: 'General' },
  { key: 'obc', label: 'OBC' },
  { key: 'sc', label: 'SC' },
  { key: 'st', label: 'ST' },
  { key: 'ews', label: 'EWS' },
];

export const SUBCAST_OPTIONS: Record<string, { key: string; label: string }[]> = {
  general: [
    { key: 'brahmin', label: 'Brahmin' },
    { key: 'rajput', label: 'Rajput' },
    { key: 'vaishya', label: 'Vaishya' },
    { key: 'kayastha', label: 'Kayastha' },
    { key: 'other', label: 'Other' },
  ],
  obc: [
    { key: 'yadav', label: 'Yadav' },
    { key: 'kurmi', label: 'Kurmi' },
    { key: 'koeri', label: 'Koeri' },
    { key: 'saini', label: 'Saini' },
    { key: 'teli', label: 'Teli' },
    { key: 'other', label: 'Other' },
  ],
  sc: [
    { key: 'jatav', label: 'Jatav' },
    { key: 'pasi', label: 'Pasi' },
    { key: 'dhobi', label: 'Dhobi' },
    { key: 'kori', label: 'Kori' },
    { key: 'other', label: 'Other' },
  ],
  st: [
    { key: 'bhil', label: 'Bhil' },
    { key: 'gond', label: 'Gond' },
    { key: 'munda', label: 'Munda' },
    { key: 'santhal', label: 'Santhal' },
    { key: 'other', label: 'Other' },
  ],
  ews: [
    { key: 'other', label: 'Other' },
  ],
};

export const PARTY_OPTIONS = [
  { key: 'bjp', label: 'BJP' },
  { key: 'inc', label: 'INC' },
  { key: 'aap', label: 'AAP' },
  { key: 'sp', label: 'SP' },
  { key: 'bsp', label: 'BSP' },
  { key: 'rjd', label: 'RJD' },
  { key: 'jdu', label: 'JDU' },
  { key: 'tmc', label: 'TMC' },
  { key: 'dmk', label: 'DMK' },
  { key: 'nota', label: 'NOTA' },
  { key: 'other', label: 'Other' },
  { key: 'undecided', label: 'Undecided' },
];

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth_access_token',
  REFRESH_TOKEN: '@auth_refresh_token',
  USER_DATA: '@auth_user_data',
  OFFLINE_QUEUE: '@offline_queue',
  BOOTH_DATA: '@booth_data',
};
