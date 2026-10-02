import { api } from './api'; import type { User } from '../types/user.types';
type LoginResponse = { user: User; token: string };
const login = (email: string, password: string) => api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const authService = { login, register: (fullName: string, email: string, password: string, phone: string, profilePhoto?: string) => api<LoginResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password, phone, profilePhoto }) }), me: () => api<{ user: User }>('/auth/me'), profile: () => api<{ data: User }>('/profile'), updateProfile: (data: Partial<User>) => api<{ data: User }>('/profile', { method: 'PATCH', body: JSON.stringify(data) }) };
