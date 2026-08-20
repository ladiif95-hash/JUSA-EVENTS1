export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const TOKEN_KEY = 'jusa_token';
const USER_KEY = 'jusa_user';

function expireSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('jusa:session-expired'));
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({} as { message?: string }));
  if (!response.ok) {
    if (response.status === 401 && token) expireSession();
    throw new Error(body.message || (response.status === 401 ? 'Your session has expired. Please sign in again.' : 'Request failed'));
  }
  return body as T;
}
