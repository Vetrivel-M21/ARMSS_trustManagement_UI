import { useEffect, useState } from 'react';
import { fetchAuthedBlobUrl } from '../utils/upload';

/** Loads a now-auth-protected /uploads asset (donor photo/KYC doc, bank QR
 * code) as a local blob: URL, since a plain <img src> never sends the app's
 * JWT. Revokes the previous object URL on cleanup/path change. */
export function useAuthedAsset(url?: string | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let created: string | null = null;
    let cancelled = false;
    setBlobUrl(null);

    if (url) {
      fetchAuthedBlobUrl(url).then((u) => {
        if (!cancelled && u) {
          created = u;
          setBlobUrl(u);
        }
      });
    }

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  return blobUrl;
}
