// src/firebase.ts
// Initialize Firebase (Firestore, Auth, Realtime DB)
// Drop-in replacement — preserves your existing firebaseConfig (databaseURL included)

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp as _serverTimestamp } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// Your Firebase config (kept from your file)
const firebaseConfig = {
  apiKey: 'AIzaSyAsdLPaQeAfr8Kz8-bn47hRz-035aYknc0',
  authDomain: 'coatschat.firebaseapp.com',
  databaseURL: 'https://coatschat-default-rtdb.firebaseio.com', // <-- RTDB URL you created
  projectId: 'coatschat',
  storageBucket: "coatschat.appspot.com",
  messagingSenderId: '92537378635',
  appId: '1:92537378635:web:bad3c4b507df54afca7ace',
  measurementId: 'G-991SNVZRHN',
};

// initialize app
const app = initializeApp(firebaseConfig);

// exports
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // realtime database export
export const serverTimestamp = _serverTimestamp;
export const storage = getStorage(app);
export default app;
