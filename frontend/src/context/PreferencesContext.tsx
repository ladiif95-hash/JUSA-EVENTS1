import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'so';
type Preferences = { theme: Theme; language: Language; setTheme: (theme: Theme) => void; setLanguage: (language: Language) => void; toggleTheme: () => void };

const PreferencesContext = createContext<Preferences | undefined>(undefined);

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try { const value = localStorage.getItem(key) as T | null; return value && allowed.includes(value) ? value : fallback; } catch { return fallback; }
};
const save = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* preferences are a convenience */ } };

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => read('jusa_theme', ['light', 'dark'] as const, 'light'));
  const [language, setLanguage] = useState<Language>(() => read('jusa_language', ['en', 'so'] as const, 'en'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    save('jusa_theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = language;
    save('jusa_language', language);
  }, [language]);

  const value = useMemo<Preferences>(() => ({ theme, language, setTheme, setLanguage, toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')) }), [theme, language]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
