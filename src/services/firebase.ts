import { FirebaseError, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, inMemoryPersistence, initializeAuth, signOut, type Auth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';

import {
  AUTH_EMULATOR_URL,
  DATABASE_EMULATOR_HOST,
  FIREBASE_CONFIG,
  FIRESTORE_EMULATOR_HOST,
  STORAGE_EMULATOR_HOST,
} from '@/constants/api';

const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);

function createAuth(): Auth {
  // Web keeps the session in the browser (local persistence by default).
  if (Platform.OS === 'web') return getAuth(app);
  // Native: the portal is web-first; keep the session in memory instead of adding a storage dependency.
  try {
    return initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(app); // already initialized (fast refresh)
  }
}

export const auth = createAuth();

if (AUTH_EMULATOR_URL && !auth.emulatorConfig) {
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
}

function createFirestore(): Firestore {
  try {
    const db = initializeFirestore(app, {});
    if (FIRESTORE_EMULATOR_HOST) {
      const [host, port] = FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(db, host, Number(port) || 8080);
    }
    return db;
  } catch {
    return getFirestore(app); // already initialized (fast refresh)
  }
}

/** Firestore for live reads the security rules allow (e.g. assignment duty status). Writes go through the backend. */
export const firestore = createFirestore();

let rtdb: Database | null | undefined;

/** The Realtime Database (driver presence and live GPS), or null when this build has no database URL. */
export function realtimeDb(): Database | null {
  if (rtdb !== undefined) return rtdb;
  if (!FIREBASE_CONFIG.databaseURL) return (rtdb = null);
  rtdb = getDatabase(app, FIREBASE_CONFIG.databaseURL);
  if (DATABASE_EMULATOR_HOST) {
    const [host, port] = DATABASE_EMULATOR_HOST.split(':');
    try {
      connectDatabaseEmulator(rtdb, host, Number(port) || 9000);
    } catch {
      // already connected (fast refresh)
    }
  }
  return rtdb;
}

let storage: FirebaseStorage | undefined;

/** Firebase Storage (Para Ad photos; admins upload, the rules check the role). */
export function fileStorage(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(app);
  if (STORAGE_EMULATOR_HOST) {
    const [host, port] = STORAGE_EMULATOR_HOST.split(':');
    try {
      connectStorageEmulator(storage, host, Number(port) || 9199);
    } catch {
      // already connected (fast refresh)
    }
  }
  return storage;
}

/** Errors meaning the saved session can never be refreshed (account deleted or disabled, emulator reset). */
const DEAD_SESSION = new Set([
  'auth/invalid-refresh-token',
  'auth/user-token-expired',
  'auth/user-not-found',
  'auth/user-disabled',
]);

export const isDeadSession = (error: unknown) => error instanceof FirebaseError && DEAD_SESSION.has(error.code);

/**
 * The signed-in user's ID token for backend calls (waits for the saved session to load first). A session that
 * can no longer be refreshed is signed out, so public pages (sign-in, accept invite) still work.
 */
export async function getIdToken(): Promise<string | null> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (error) {
    if (!isDeadSession(error)) throw error;
    await signOut(auth);
    return null;
  }
}
