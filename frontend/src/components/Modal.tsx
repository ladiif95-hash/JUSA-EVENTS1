import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // Parents usually pass an inline onClose; keep the latest in a ref so re-renders don't re-run the
  // mount effect and steal focus from the field being typed in.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={event => event.stopPropagation()}>
      <header className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close dialog"><X/></button>
      </header>
      <div className="modal-body">{children}</div>
    </section>
  </div>;
}
