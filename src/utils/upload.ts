import { fetchAPI } from '../api/client';

/** Uploads a single file to the backend's generic /uploads endpoint and
 * returns the servable path (e.g. "/uploads/abc123.jpg"), or null on failure. */
export async function uploadFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetchAPI<{ path: string }>('/uploads', { method: 'POST', body: formData });
  return res.success && res.data ? res.data.path : null;
}

/** Forces a real browser download of a same-origin/cross-origin file URL.
 * A plain `<a download href={url}>` is silently ignored by browsers when the
 * URL is cross-origin (frontend on :5173, files served from the backend on
 * :8080) — it just navigates instead of downloading. Fetching the bytes and
 * downloading via a blob: URL (always same-origin) sidesteps that. Uses
 * `cache: 'no-store'` because the same URL may already be cached as an opaque
 * no-cors response from an on-screen <img> preview, which would otherwise
 * fail a normal cors-mode fetch (see voucherPdf.ts's loadImage). */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch file (status ${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
