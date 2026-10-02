import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import AlertDialog from '../components/AlertDialog';

type Tone = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; tone: Tone; message: string };
type ConfirmOptions = { title: string; message: string; confirmLabel?: string; cancelLabel?: string; tone?: 'danger' | 'warning' };
type Feedback = { show: (message: string, tone?: Tone) => void; confirm: (options: ConfirmOptions) => Promise<boolean> };

const ToastContext = createContext<Feedback | undefined>(undefined);
const icons = { success: CheckCircle2, error: XCircle, warning: TriangleAlert, info: Info };
const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Notice' };

// App-wide feedback: toast notifications plus a promise-based confirmation dialog (replaces window.confirm).
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const show = useCallback((message: string, tone: Tone = 'info') => {
    const id = ++nextId.current;
    setItems((current) => [...current.slice(-3), { id, tone, message }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);
  const settle = (value: boolean) => { pending?.resolve(value); setPending(null); };

  const value = useMemo(() => ({ show, confirm }), [show, confirm]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const Icon = icons[item.tone];
          return (
            <div className={`toast toast-${item.tone}`} key={item.id} role={item.tone === 'error' ? 'alert' : 'status'}>
              <span className="toast-icon"><Icon aria-hidden="true" /></span>
              <div><b>{titles[item.tone]}</b><span>{item.message}</span></div>
              <button type="button" aria-label="Dismiss notification" data-tooltip="Dismiss" onClick={() => dismiss(item.id)}><X /></button>
              <i className="toast-timer" aria-hidden="true" />
            </div>
          );
        })}
      </div>
      {pending && (
        <AlertDialog
          tone={pending.tone || 'danger'}
          title={pending.title}
          message={pending.message}
          action={pending.confirmLabel || 'Confirm'}
          onClose={() => settle(true)}
          cancel={{ label: pending.cancelLabel || 'Cancel', onClick: () => settle(false) }}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
