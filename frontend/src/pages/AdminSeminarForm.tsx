import { useEffect, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { categories } from '../types/seminar.types';
import { seminarService } from '../services/seminar.service';
import PhotoUpload from '../components/PhotoUpload';
import { useToast } from '../context/ToastContext';
import { assetUrl, fromCampusInput, toCampusInput } from '../utils/campus';

const empty = {
  title: '',
  shortDescription: '',
  description: '',
  category: 'Technology',
  speaker: '',
  speakerPosition: '',
  venue: 'JUST Main Campus Hall',
  startDateTime: '',
  endDateTime: '',
  capacity: 120,
  coverImage: '',
  speakerPhoto: '',
  status: 'PUBLISHED',
};

// Posters are often multi-megabyte PNGs; store a 1600px JPEG instead (GIFs keep their animation).
async function optimisePoster(file: File): Promise<string> {
  const readAsDataUrl = () => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = reject; reader.readAsDataURL(file); });
  if (file.type === 'image/gif') return readAsDataUrl();
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(image.src);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export default function AdminSeminarForm() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { id } = useParams();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedImages, setLoadedImages] = useState({ coverImage: '', speakerPhoto: '' });
  const set = (key: keyof typeof empty, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const chooseCoverImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WebP, or GIF).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('The poster must be 15 MB or smaller.');
      return;
    }
    try {
      set('coverImage', await optimisePoster(file));
      setError('');
    } catch {
      setError('This image could not be read. Try a JPG or PNG file.');
    }
  };

  useEffect(() => {
    if (!id) return;
    seminarService.adminList().then((response) => {
      const source = response.data.find((item) => item.id === id || (item as typeof item & { _id?: string })._id === id);
      if (!source) return setError('Seminar not found.');
      const coverImage = assetUrl(source.coverImage || source.image);
      const speakerPhoto = assetUrl(source.speakerPhoto);
      setLoadedImages({ coverImage, speakerPhoto });
      setForm({ title: source.title || '', shortDescription: source.shortDescription || '', description: source.description || '', category: source.category || 'Technology', speaker: source.speaker || '', speakerPosition: source.speakerPosition || '', venue: source.venue || '', startDateTime: toCampusInput(source.startDateTime), endDateTime: toCampusInput(source.endDateTime), capacity: source.capacity || 1, coverImage, speakerPhoto, status: source.status || 'PUBLISHED' });
    }).catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load this seminar.'));
  }, [id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    // Times are entered in campus time (EAT); unchanged images are not re-uploaded.
    const payload: Record<string, unknown> = { ...form, capacity: Number(form.capacity), startDateTime: fromCampusInput(form.startDateTime), endDateTime: fromCampusInput(form.endDateTime) };
    if (id && form.coverImage === loadedImages.coverImage) delete payload.coverImage;
    if (id && form.speakerPhoto === loadedImages.speakerPhoto) delete payload.speakerPhoto;
    try {
      if (id) await seminarService.update(id, payload); else await seminarService.create(payload);
      show(id ? 'Seminar updated.' : 'Seminar created and published.', 'success');
      navigate('/admin/seminars');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to create seminar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-page">
      <span className="eyebrow">SEMINAR MANAGEMENT</span>
      <h1>{id ? 'Edit seminar' : 'Create seminar'}</h1>
      <p className="admin-lead">{id ? 'Update the event details students and staff rely on.' : 'Publish a new JUTSA event. Students will see it immediately if status is Published.'}</p>
      <form className="admin-panel profile-form seminar-form" onSubmit={submit}>
        <label>Title<input required value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="Cybersecurity Awareness Seminar" /></label>
        <label>Category
          <select value={form.category} onChange={(event) => set('category', event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="full">Short description<input required value={form.shortDescription} onChange={(event) => set('shortDescription', event.target.value)} placeholder="One-line summary for cards" /></label>
        <label className="full">Full description<textarea required rows={5} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="What students will learn" /></label>
        <label>Speaker<input value={form.speaker} onChange={(event) => set('speaker', event.target.value)} placeholder="Abdirahman Hassan" /></label>
        <label>Speaker title<input value={form.speakerPosition} onChange={(event) => set('speakerPosition', event.target.value)} placeholder="Cybersecurity Specialist" /></label>
        <div className="full speaker-photo-field">
          <b>Featured speaker photo</b>
          <PhotoUpload compact value={form.speakerPhoto} onChange={(photo) => set('speakerPhoto', photo)} label="Upload speaker photo" hint="Square portrait works best · PNG or JPG" changeLabel="Change photo" removeLabel="Remove photo" />
        </div>
        <label>Venue<input required value={form.venue} onChange={(event) => set('venue', event.target.value)} /></label>
        <label>Capacity<input required type="number" min={1} value={form.capacity} onChange={(event) => set('capacity', Number(event.target.value))} /></label>
        <label>Starts <small className="tz-hint">Somalia time (EAT)</small><input required type="datetime-local" value={form.startDateTime} onChange={(event) => set('startDateTime', event.target.value)} /></label>
        <label>Ends <small className="tz-hint">Somalia time (EAT)</small><input type="datetime-local" value={form.endDateTime} onChange={(event) => set('endDateTime', event.target.value)} /></label>
        <div className="full cover-image-field">
          <div className="cover-field-heading">
            <div><b>Seminar poster</b><span>Upload the event poster (JPG, PNG, WebP or GIF). Large images are optimised automatically and shown uncropped.</span></div>
            {form.coverImage && <button type="button" className="cover-remove" onClick={() => set('coverImage', '')}><Trash2/>Remove</button>}
          </div>
          {form.coverImage ? <div className="cover-preview-wrap"><img className="cover-preview" src={form.coverImage} alt="Selected cover preview" /><label className="cover-replace"><Upload/>Replace image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseCoverImage}/></label></div> : <label className="cover-upload"><ImagePlus/><b>Add cover image</b><span>Choose a file from your computer</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseCoverImage}/><em><Upload/>Select image</em></label>}
          <label className="cover-url-label">Or paste an image URL<input value={form.coverImage.startsWith('data:') || form.coverImage === loadedImages.coverImage ? '' : form.coverImage} onChange={(event) => set('coverImage', event.target.value)} placeholder="https://example.com/event-poster.jpg" /></label>
        </div>
        <label>Status
          <select value={form.status} onChange={(event) => set('status', event.target.value)}>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </label>
        {error && <div className="status-bar status-bar-fail full"><b>{error}</b></div>}
        <div className="form-actions full">
          <Link className="button button-outline" to="/admin/seminars">Cancel</Link>
          <button className="button" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create seminar'}</button>
        </div>
      </form>
    </section>
  );
}
