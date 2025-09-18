// src/notifications.ts
// Drop-in notifications helper for Android (FCM + Notifee)
// Requires: @react-native-firebase/messaging, @notifee/react-native
// Uses your existing src/firebase.ts export `db` (Firestore Web v9 modular).

import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * initNotifications(userId?)
 *  - Requests Android runtime permission (API 33+)
 *  - Gets FCM token and saves to Firestore under users/{userId}.fcmTokens (array)
 *  - Registers foreground handlers and token refresh handler
 *
 * Call this AFTER the user signs in (so `userId` is known). If you call
 * before sign-in, call getAndSaveToken() later to associate token with user.
 */
export async function initNotifications(userId?: string) {
  // 1) request permission for Android 13+
  await requestAndroidNotificationPermission();

  // 2) get token and save if userId provided
  const token = await getAndSaveToken(userId);

  // 3) foreground message handler
  messaging().onMessage(async remoteMessage => {
    console.log('[FCM] onMessage (foreground):', remoteMessage);
    // show a local notification using Notifee
    await displayLocalNotification(remoteMessage);
  });

  // 4) handle notification-open from background
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[FCM] opened from background:', remoteMessage);
    // TODO: navigate to chat screen using remoteMessage.data.chatId
  });

  // 5) token refresh -> persist new token to Firestore
  messaging().onTokenRefresh(async newToken => {
    console.log('[FCM] token refreshed', newToken);
    if (userId) await saveTokenToFirestore(userId, newToken);
  });

  return token;
}

/**
 * Requests runtime permission for Android 13+ (POST_NOTIFICATIONS).
 * Older Android versions skip runtime request and return true.
 */
export async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = Platform.constants?.Version ?? 0;
    if (apiLevel < 33) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Notifications permission',
        message: 'Allow app to send you chat notifications',
        buttonPositive: 'OK',
      }
    );
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log('[FCM] notification permission granted?', ok);
    return ok;
  } catch (err) {
    console.warn('[FCM] permission request error', err);
    return false;
  }
}

/** Get FCM token and save to Firestore if userId provided */
export async function getAndSaveToken(userId?: string) {
  try {
    const token = await messaging().getToken();
    console.log('[FCM] device token:', token);
    if (userId) await saveTokenToFirestore(userId, token);
    return token;
  } catch (err) {
    console.warn('[FCM] getToken error', err);
    return null;
  }
}

/** Save token to Firestore under users/{userId}.fcmTokens (arrayUnion) */
export async function saveTokenToFirestore(userId: string, token: string) {
  try {
    const userRef = doc(db, 'users', userId);
    // setDoc with merge true will create/merge the field
    await setDoc(userRef, { fcmTokens: arrayUnion(token) }, { merge: true });
    console.log('[FCM] token saved for user', userId);
  } catch (err) {
    console.warn('[FCM] saveTokenToFirestore error', err);
  }
}

/** Remove a token from Firestore (call on sign-out if possible) */
export async function removeTokenFromFirestore(userId: string, token: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { fcmTokens: arrayRemove(token) });
    console.log('[FCM] removed token for user', userId);
  } catch (err) {
    console.warn('[FCM] removeTokenFromFirestore error', err);
  }
}

/** Display a local notification using Notifee (works for foreground and background) */
export async function displayLocalNotification(remoteMessage: any) {
  try {
    const title = remoteMessage.notification?.title ?? remoteMessage.data?.title ?? 'New message';
    const body = remoteMessage.notification?.body ?? remoteMessage.data?.body ?? '';

    // create channel (Android)
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        // smallIcon must reference an Android drawable/resource in res/ (no extension)
        smallIcon: 'ic_notification', // ensure you add the resource to res/drawable-*/ or res/mipmap-*
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (err) {
    console.warn('[Notifee] displayLocalNotification error', err);
  }
}
