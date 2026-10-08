import { Platform } from 'react-native';

export const APP_NAME = 'UtsavX';

/**
 * Where the app finds the UtsavX API.
 * The app uses the deployed Render API (same base URL as the manager app).
 * To work against your own computer instead, set USE_LOCAL_API = true:
 * - Android emulator → 10.0.2.2 (your computer's localhost).
 * - Real phone over USB → localhost; `npm run android` runs `adb reverse tcp:5050 tcp:5050`.
 */
const PRODUCTION_API_URL = 'https://utsavx.onrender.com/api/v1';
const USE_LOCAL_API = false;

const device = Platform.constants || {};
const isEmulator = /generic|emulator|sdk_gphone|google_sdk/i.test(
  `${device.Fingerprint || ''} ${device.Model || ''}`,
);
const LOCAL_API_URL = isEmulator
  ? 'http://10.0.2.2:5050/api/v1' // Android emulator → host localhost
  : 'http://localhost:5050/api/v1'; // USB phone via adb reverse

export const API_URL = (
  __DEV__ && USE_LOCAL_API ? LOCAL_API_URL : PRODUCTION_API_URL
).replace(/\/+$/, '');
export const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');

/** Server holds unpaid checkout seats for HOLD_TTL_MINUTES (default 15). */
export const HOLD_MINUTES = 15;
/** Per ticket type, per order. The API allows 20; the web app offers 10. */
export const MAX_TICKETS_PER_TYPE = 10;
