/**
 * Backend and Firebase settings, per environment (see para-backend/docs/deployment.md).
 *
 * Without EXPO_PUBLIC_FIREBASE_API_KEY the portal runs against the local Firebase
 * emulators (Auth on :9099, Functions on :5001) with a placeholder config.
 */
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

/** True when no Firebase web config is set: use the local emulators. */
export const USE_EMULATORS = !apiKey;

/**
 * Sign in against the Auth emulator even with a real web config. Needed locally because invites create
 * accounts wherever the functions run (the emulator), so local sign-in must use the same Auth.
 */
export const USE_AUTH_EMULATOR = USE_EMULATORS || process.env.EXPO_PUBLIC_USE_AUTH_EMULATOR === '1';

const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'para-a9efb';

export const FIREBASE_CONFIG = {
  // The emulator accepts any key; deployed projects need the real web app key.
  apiKey: apiKey ?? 'local-emulator',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  // Realtime Database (driver presence and live GPS). Locally only the name before ".firebaseio.com" matters.
  // Firebase Storage (para-ads photos). Projects made since 2024 use "<project>.firebasestorage.app".
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${projectId}.firebasestorage.app`,
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
    (USE_AUTH_EMULATOR ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined),
};

export const AUTH_EMULATOR_URL =
  process.env.EXPO_PUBLIC_AUTH_EMULATOR_URL ?? (USE_AUTH_EMULATOR ? 'http://127.0.0.1:9099' : undefined);

/**
 * Firestore emulator host ("host:port") for live reads (onSnapshot), or undefined for the real project.
 * Follows the Auth emulator, since local sign-in tokens only work against the emulators.
 */
export const FIRESTORE_EMULATOR_HOST =
  process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST ?? (USE_AUTH_EMULATOR ? '127.0.0.1:8080' : undefined);

/** Realtime Database emulator host ("host:port"), or undefined for the real project. */
export const DATABASE_EMULATOR_HOST =
  process.env.EXPO_PUBLIC_DATABASE_EMULATOR_HOST ?? (USE_AUTH_EMULATOR ? '127.0.0.1:9000' : undefined);

/** Storage emulator host ("host:port") for Para Ad photos, or undefined for the real project. */
export const STORAGE_EMULATOR_HOST =
  process.env.EXPO_PUBLIC_STORAGE_EMULATOR_HOST ?? (USE_AUTH_EMULATOR ? '127.0.0.1:9199' : undefined);

/** Base URL of the para-backend callable functions. */
export const FUNCTIONS_URL =
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ?? `http://127.0.0.1:5001/${FIREBASE_CONFIG.projectId}/asia-southeast1`;
