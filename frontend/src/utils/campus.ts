import { API_URL } from '../services/api';

// All JUTSA events happen in Mogadishu, so times are shown and entered in East Africa Time
// no matter which timezone the viewer's device (or the server) is set to.
export const CAMPUS_TIME_ZONE = 'Africa/Mogadishu';
const CAMPUS_OFFSET = '+03:00';
const CAMPUS_OFFSET_MS = 3 * 60 * 60 * 1000;

export const formatCampusDate = (value?: string | Date | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  value ? new Date(value).toLocaleDateString('en-GB', { ...options, timeZone: CAMPUS_TIME_ZONE }) : '';

export const formatCampusTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: CAMPUS_TIME_ZONE }) : '';

// ISO instant -> "YYYY-MM-DDTHH:mm" for a datetime-local input showing campus time.
export const toCampusInput = (value?: string | null) =>
  value ? new Date(new Date(value).getTime() + CAMPUS_OFFSET_MS).toISOString().slice(0, 16) : '';

// datetime-local value (campus time) -> unambiguous ISO string for the API.
export const fromCampusInput = (value: string) => (value ? `${value}:00${CAMPUS_OFFSET}` : '');

// Images stored by the API are returned as API-relative paths (e.g. /seminars/<id>/cover?v=…).
export const assetUrl = (value?: string | null) => (value && value.startsWith('/seminars/') ? `${API_URL}${value}` : value || '');
