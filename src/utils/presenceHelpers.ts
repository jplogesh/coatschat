// src/utils/presenceHelpers.ts
import { rtdb, db } from '../../firebase';
import { ref as rtdbRef, set as rtdbSet, onDisconnect as rtdbOnDisconnect } from 'firebase/database';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * markUserOnline(uid)
 * - sets /status/{uid} = { state: 'online', lastChanged: now } in RTDB
 * - sets onDisconnect to write offline automatically
 * - also mirrors online:true in Firestore users/{uid}
 */
export async function markUserOnline(uid: string) {
  if (!uid) {return;}
  try {
    const statusRef = rtdbRef(rtdb, `/status/${uid}`);
    await rtdbSet(statusRef, { state: 'online', lastChanged: Date.now() });

    // schedule offline for unexpected disconnect
    try {
      const od = rtdbOnDisconnect(statusRef);
      // using modular SDK onDisconnect.set
      await od.set({ state: 'offline', lastChanged: Date.now() });
    } catch (e) {
      // onDisconnect might throw in some RN envs - ignore but presence still works on clean signout
    }

    // mirror to Firestore (so UI code reading users/{uid} still works)
    await setDoc(doc(db, 'users', uid), { online: true }, { merge: true });
  } catch (e) {
    console.warn('markUserOnline failed', e);
  }
}

/**
 * markUserOffline(uid)
 * - called on app exit / signout => writes offline + lastSeen timestamp
 */
export async function markUserOffline(uid: string) {
  if (!uid) {return;}
  try {
    const statusRef = rtdbRef(rtdb, `/status/${uid}`);
    await rtdbSet(statusRef, { state: 'offline', lastChanged: Date.now() });

    await setDoc(doc(db, 'users', uid), { online: false, lastSeen: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('markUserOffline failed', e);
  }
}
