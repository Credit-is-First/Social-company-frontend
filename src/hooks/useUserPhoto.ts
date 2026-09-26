import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

/**
 * Loads a user's profile photo and hands back an object URL.
 *
 * The photo route is authenticated, so it cannot be used directly as an <img>
 * src — the browser would not attach the Authorization header. This fetches it
 * through the API client and revokes the object URL on cleanup.
 *
 * `version` should change whenever the photo does (the user's updatedAt works
 * well) so a replaced photo is re-fetched rather than served from a stale URL.
 */
export function useUserPhoto(userId?: string, hasPhoto?: boolean, version?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !hasPhoto) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    usersAPI
      .getPhotoBlob(userId)
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        // A missing or forbidden photo just falls back to initials.
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, hasPhoto, version]);

  return url;
}
