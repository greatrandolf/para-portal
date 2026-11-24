import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { fileStorage } from '@/services/firebase';

/** Photo limits, matching storage.rules (para-ads). */
export const AD_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const AD_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Why a picked photo can't be used, or undefined when it is fine. */
export function photoProblem(mimeType: string | undefined, size: number | undefined): string | undefined {
  if (!mimeType || !(AD_PHOTO_TYPES as readonly string[]).includes(mimeType)) return 'Use a JPG, PNG or WebP photo.';
  if (size !== undefined && size > AD_PHOTO_MAX_BYTES) return 'The photo must be 2 MB or smaller.';
  return undefined;
}

/**
 * Uploads a Para Ad photo to paraAds/{campaignId}/ and returns its path and download URL (the backend checks both
 * belong to this project's bucket).
 */
export async function uploadAdPhoto(
  campaignId: string,
  uri: string,
  mimeType: string,
): Promise<{ imagePath: string; imageUrl: string }> {
  const blob = await (await fetch(uri)).blob();
  const imagePath = `paraAds/${campaignId}/photo-${Date.now()}.${EXT[mimeType] ?? 'jpg'}`;
  const fileRef = ref(fileStorage(), imagePath);
  await uploadBytes(fileRef, blob, { contentType: mimeType });
  return { imagePath, imageUrl: await getDownloadURL(fileRef) };
}
