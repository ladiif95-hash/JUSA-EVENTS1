import { useEffect, useRef } from 'react';
import { AlertTriangle, Check, Trash2, X } from 'lucide-react';

export type AlertTone = 'error' | 'success' | 'warning' | 'danger';

// Centered result / confirmation popup (failed, success, warning, destructive confirm).
export default function AlertDialog({ tone, title, message, action, onClose, cancel }: { tone: AlertTone; title: string; message: string; action: string; onClose: () => void; cancel?: { label: string; onClick: () => void } }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onDismiss = useRef(cancel?.onClick ?? onClose);
  onDismiss.current = cancel?.onClick ?? onClose;

  useEffect(() => {
    buttonRef.current?.focus();
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onDismiss.current();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const Icon = tone === 'success' ? Check : tone === 'warning' ? AlertTriangle : tone === 'danger' ? Trash2 : X;
  return (
    <div className="alert-backdrop" role="presentation" onMouseDown={() => onDismiss.current()}>
      <section className={`alert-dialog ${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-message" onMouseDown={(event) => event.stopPropagation()}>
        <span className="alert-icon"><Icon aria-hidden="true" strokeWidth={tone === 'danger' ? 2.4 : 3} /></span>
        <h2 id="alert-title">{title}</h2>
        <p id="alert-message">{message}</p>
        <div className={cancel ? 'alert-actions two' : 'alert-actions'}>
          {cancel && <button type="button" className="alert-cancel" onClick={cancel.onClick}>{cancel.label}</button>}
          <button ref={buttonRef} type="button" onClick={onClose}>{action}</button>
        </div>
      </section>
    </div>
  );
}
