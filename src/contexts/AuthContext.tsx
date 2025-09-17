// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '../../firebase'; // <- ensure firebase.ts exports auth and db
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { markUserOnline, markUserOffline } from '../utils/presenceHelpers';

type MinimalUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  location?: string | null;
} | null;

type AuthContextType = {
  user: MinimalUser;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, location?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * createOrUpdateUserDoc
 * - ensures a users/{uid} doc exists with basic profile fields
 * - uses merge writes so presence/online doesn't clobber profile
 */
const createOrUpdateUserDoc = async (u: FirebaseUser | null, displayNameOverride?: string, location?: string) => {
  if (!u?.uid) return;
  const userRef = doc(db, 'users', u.uid);
  try {
    const displayName = displayNameOverride ?? u.displayName ?? null;
    const payload: any = {
      uid: u.uid,
      email: u.email ?? null,
      displayName,
      displayNameLower: (displayName ?? '').toLowerCase(),
      photoURL: u.photoURL ?? null,
      location: location || null,
      updatedAt: serverTimestamp(),
    };
    // merge:true - safe to call even if doc already exists
    await setDoc(userRef, { ...payload, createdAt: serverTimestamp(), online: true }, { merge: true });
    console.log('[Auth] createOrUpdateUserDoc OK', u.uid);
  } catch (err) {
    console.warn('[Auth] createOrUpdateUserDoc failed', err);
    throw err;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MinimalUser>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Observe auth state and initialize presence & user doc.
  useEffect(() => {
    setLoading(true);
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          // Minimal local user representation
          const minimal = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName ?? null,
            photoURL: u.photoURL ?? null,
          };
          setUser(minimal);
          setLoading(false);
          // Ensure Firestore user doc exists / updated
          try {
            await createOrUpdateUserDoc(u);
          } catch (e) {
            console.warn('[Auth] createOrUpdateUserDoc in onAuthStateChanged failed', e);
          }

          // Mark presence online (RTDB + mirror to Firestore)
          try {
            await markUserOnline(u.uid);
          } catch (e) {
            console.warn('[Auth] markUserOnline in onAuthStateChanged failed', e);
          }
        } else {
          // user signed out
          // attempt to mark previous user offline
          if (user?.uid) {
            try {
              await markUserOffline(user.uid);
            } catch (e) {
              console.warn('[Auth] markUserOffline on auth change failed', e);
            }
          }
          setUser(null);
          setLoading(false);
        }
      } catch (outerErr) {
        console.warn('[Auth] onAuthStateChanged handler failed', outerErr);
        setLoading(false);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AppState changes - soft presence updates (onDisconnect in RTDB handles abrupt crashes)
  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setAppState(next);
        return;
      }

      if (appState.match(/inactive|background/) && next === 'active') {
        // came to foreground
        markUserOnline(uid).catch((e) => console.warn('[Auth] markUserOnline on foreground failed', e));
      } else if (appState === 'active' && next.match(/inactive|background/)) {
        // going to background
        markUserOffline(uid).catch((e) => console.warn('[Auth] markUserOffline on background failed', e));
      }
      setAppState(next);
    };

    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [appState]);

  // signUp: create auth user, update auth profile, then create user doc + mark online
  const signUp = async (email: string, password: string, displayName?: string, location?: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // set displayName on auth profile (so auth.user has it)
      if (displayName && cred.user) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch (e) {
          console.warn('[Auth] updateProfile failed', e);
        }
      }

      // create or update Firestore user doc (merge true)
      try {
        await createOrUpdateUserDoc(cred.user, displayName, location);
      } catch (e) {
        console.warn('[Auth] createOrUpdateUserDoc after signUp failed', e);
      }
  // Refresh local user state so UI updates immediately
    await refreshUser();
      // mark presence online
      try {
        await markUserOnline(cred.user.uid);
      } catch (e) {
        console.warn('[Auth] markUserOnline after signUp failed', e);
      }
    } catch (err) {
      console.warn('[Auth] signUp failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // signIn: authenticate, ensure user doc exists, mark online
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const u = cred.user;

      // ensure user doc exists (create if missing)
      try {
        const userRef = doc(db, 'users', u.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await createOrUpdateUserDoc(u);
        } else {
          // set online = true (merge) so presence is mirrored
          await setDoc(userRef, { online: true, updatedAt: serverTimestamp() }, { merge: true });
        }
      } catch (e) {
        console.warn('[Auth] ensure user doc on signIn failed', e);
      }

      // mark presence online
      try {
        await markUserOnline(u.uid);
      } catch (e) {
        console.warn('[Auth] markUserOnline after signIn failed', e);
      }
    } catch (err) {
      console.warn('[Auth] signIn failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // signOut: mark offline then sign out
  const signOut = async () => {
    const uid = auth.currentUser?.uid;
    try {
      if (uid) {
        await markUserOffline(uid);
      }
    } catch (e) {
      console.warn('[Auth] markUserOffline in signOut failed', e);
    }

    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (e) {
      console.warn('[Auth] firebaseSignOut failed', e);
      throw e;
    }
  };

  const refreshUser = async () => {
  const u = auth.currentUser;
  if (u) {
    await u.reload();
    setUser({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName ?? null,
      photoURL: u.photoURL ?? null,
    });
  }
};

  const value = useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export default AuthContext;
