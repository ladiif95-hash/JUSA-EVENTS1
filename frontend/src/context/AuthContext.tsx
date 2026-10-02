import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types/user.types';

type AuthContextValue = { user: User | null; isLoading: boolean; login: (email: string, password: string) => Promise<User>; register: (fullName: string, email: string, password: string, phone: string, profilePhoto?: string) => Promise<User>; setSession: (token: string, user: User) => void; logout: () => void };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USER_KEY = 'jusa_user';
const TOKEN_KEY = 'jusa_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => { try { const saved = localStorage.getItem(USER_KEY); return saved ? JSON.parse(saved) as User : null; } catch { return null; } });
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => { if (!user) localStorage.removeItem(USER_KEY); }, [user]);
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener('jusa:session-expired', expire);
    return () => window.removeEventListener('jusa:session-expired', expire);
  }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user, isLoading,
    login: async (email, password) => { setIsLoading(true); try { const result = await authService.login(email, password); localStorage.setItem(TOKEN_KEY, result.token); localStorage.setItem(USER_KEY, JSON.stringify(result.user)); setUser(result.user); return result.user; } finally { setIsLoading(false); } },
    register: async (fullName, email, password, phone, profilePhoto) => { setIsLoading(true); try { const result = await authService.register(fullName, email, password, phone, profilePhoto); localStorage.setItem(TOKEN_KEY, result.token); localStorage.setItem(USER_KEY, JSON.stringify(result.user)); setUser(result.user); return result.user; } finally { setIsLoading(false); } },
    setSession: (token, nextUser) => { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); setUser(nextUser); },
    logout: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setUser(null); },
  }), [isLoading, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
