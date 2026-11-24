import { useQueryClient } from '@tanstack/react-query';
import { FirebaseError } from 'firebase/app';
import {
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { isRole, roleCan, type Permission, type Role } from '@/constants/roles';
import { auth, isDeadSession } from '@/services/firebase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** role comes from the `role` custom claim (set by an accepted invite or `npm run set-role`); null = no access. */
  | { status: 'signedIn'; user: User; role: Role | null };

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Fetches a fresh ID token, e.g. after a role was granted. */
  refreshClaims: () => Promise<void>;
  /** Whether the signed-in user's role grants `permission` (UI only; the backend checks again). */
  can: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Friendly text for Firebase Auth errors; other errors keep their own message. */
export function authErrorMessage(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/missing-password':
      return 'Enter your password.';
    case 'auth/user-token-expired':
      return 'Your session has ended. Sign in again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your cooperative.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Cannot reach the sign-in service. Check your connection.';
    default:
      return error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const queryClient = useQueryClient();

  // Fires on sign-in, sign-out, and every token refresh (so claim changes are picked up).
  useEffect(
    () =>
      onIdTokenChanged(auth, async (user) => {
        if (!user) {
          setState({ status: 'signedOut' });
          return;
        }
        try {
          const { claims } = await user.getIdTokenResult();
          // The legacy `admin: true` claim counts as super admin, like on the backend.
          const role = isRole(claims.role) ? claims.role : claims.admin === true ? 'super_admin' : null;
          setState({ status: 'signedIn', user, role });
        } catch (error) {
          // A saved session that can't be refreshed (e.g. the emulator was reset) is dropped, not kept half-alive.
          if (isDeadSession(error)) await firebaseSignOut(auth);
          else setState({ status: 'signedIn', user, role: null });
        }
      }),
    [],
  );

  const value: AuthContextValue = {
    ...state,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    signOut: async () => {
      await firebaseSignOut(auth);
      // Cached route data belongs to the previous user.
      queryClient.clear();
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email.trim());
    },
    refreshClaims: async () => {
      await auth.currentUser?.getIdToken(true);
    },
    can: (permission) => state.status === 'signedIn' && roleCan(state.role, permission),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
