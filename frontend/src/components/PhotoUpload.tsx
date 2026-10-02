import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

// Downscale in the browser so profile photos stay small (well under the API's 400 KB limit).
async function resizeImage(file: File, maxSize = 320): Promise<string> {
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unsupported image'));
    image.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(source.src);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function PhotoUpload({ value, onChange, label, changeLabel, removeLabel, hint, compact = false }: { value: string; onChange: (dataUrl: string) => void; label: string; changeLabel: string; removeLabel: string; hint?: string; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const accept = async (file?: File) => {
    setError('');
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setError('PNG, JPG or WEBP');
    if (file.size > 8 * 1024 * 1024) return setError('Max 8 MB');
    try { onChange(await resizeImage(file)); } catch { setError('PNG, JPG or WEBP'); }
  };

  return (
    <div className={`photo-upload${compact ? ' compact' : ''}${value ? ' has-photo' : ''}`}>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { void accept(event.target.files?.[0]); event.target.value = ''; }} />
      {value ? (
        <div className="photo-preview">
          <img src={value} alt="" />
          <div className="photo-actions">
            <button type="button" onClick={() => input.current?.click()}>{changeLabel}</button>
            <button type="button" className="photo-remove" onClick={() => onChange('')} aria-label={removeLabel}><Trash2 aria-hidden="true" /></button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`photo-drop${dragging ? ' dragging' : ''}`}
          onClick={() => input.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void accept(event.dataTransfer.files?.[0]); }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1" /><path d="M14 3v4h4" /><path d="M14 3l4 4v3" />
            <path d="M14.5 21a3.5 3.5 0 0 1-.4-6.98A4 4 0 0 1 21.6 15.6 2.75 2.75 0 0 1 21 21z" />
          </svg>
          <span>{label}</span>
          {hint && <small>{hint}</small>}
        </button>
      )}
      {error && <small className="photo-error" role="alert">{error}</small>}
    </div>
  );
}
