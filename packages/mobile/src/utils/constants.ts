// Change API_URL to your laptop's LAN IP if your Wi-Fi changes.
// Android emulator can also use 10.0.2.2 to reach the host.
// Uses adb reverse tcp:9003 tcp:9003 — works over USB regardless of WiFi.
// For WiFi-only testing, replace with your laptop's LAN IP.
export const API_URL = 'http://10.63.200.114:9003/api';
export const SOCKET_URL = 'http://10.63.200.114:9003';
export const IMAGEKIT_PUBLIC_KEY = 'public_Lve3HzTkm0sFK1RfoosMkz+yDMk=';
export const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/aiwats';

// POLLSTICS — Civic baseline
// Ink / Indigo / Brass on Cream. Partisan-neutral palette.
export const COLORS = {
  // Surfaces
  ink: '#0F1B2D',
  inkSoft: '#1C2A41',
  cream: '#F8F6F1',
  paper: '#FFFFFF',
  hairline: '#E6E1D6',
  hairlineSoft: '#EFEAE0',
  muted: '#6B7383',
  mutedDeep: '#3D4756',

  // Brand
  indigo: '#1F3A8A',
  indigoDeep: '#162C6E',
  indigoSoft: '#E8ECF8',
  brass: '#B7873A',
  brassSoft: '#F4EBD6',

  // Brand — extended
  gold: '#C9A14C',
  brassTint: '#FAF5E8',
  indigoTint: '#F2F4FB',
  paper2: '#F6F1E6',
  signal: '#C2241F',
  signalSoft: '#F8E1DE',

  // Semantic
  success: '#1F7A4E',
  successSoft: '#DDEFE4',
  warning: '#C6850D',
  warningSoft: '#FBEFD2',
  danger: '#B8331F',
  dangerSoft: '#F7DCD5',
  info: '#205B9C',
  infoSoft: '#DCE7F3',

  // Aliases preserved for any lingering call-sites — point to civic palette.
  primary: '#1F3A8A',
  primaryDark: '#162C6E',
  primaryLight: '#E8ECF8',
  primaryMuted: '#F4EBD6',
  accent: '#205B9C',
  accentLight: '#DCE7F3',
  successLight: '#DDEFE4',
  warningLight: '#FBEFD2',
  dangerLight: '#F7DCD5',
  infoLight: '#DCE7F3',
  background: '#F8F6F1',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEAE0',
  white: '#FFFFFF',
  black: '#0F1B2D',
  hero: '#0F1B2D',
  heroAccent: '#1C2A41',
  grey100: '#F4F2EC',
  grey200: '#E6E1D6',
  grey300: '#CFC9BA',
  grey400: '#9B9685',
  grey500: '#6B7383',
  grey600: '#4F5867',
  grey700: '#3D4756',
  grey800: '#1F2A3A',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth_access_token',
  REFRESH_TOKEN: '@auth_refresh_token',
  USER_DATA: '@auth_user_data',
};
