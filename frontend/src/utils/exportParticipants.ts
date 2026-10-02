import { API_URL } from '../services/api';

// Plain <a href> links can't send the Authorization header, so exports are fetched and saved as a blob.
export async function downloadExport(path: string, fallbackName: string) {
  const token = localStorage.getItem('jusa_token');
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error('Unable to export this report.');
  const disposition = response.headers.get('Content-Disposition') || '';
  const filename = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1] || fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = decodeURIComponent(filename); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const exportParticipants = (seminarId: string) => downloadExport(`/admin/seminars/${seminarId}/export`, 'jusa-participants.xlsx');
