/**
 * @format
 */
import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Required: headless JS background handler for messages when app is backgrounded/quit.
// Keep this lightweight.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background message received:', remoteMessage);

  try {
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title: remoteMessage.notification?.title ?? remoteMessage.data?.title ?? 'New message',
      body: remoteMessage.notification?.body ?? remoteMessage.data?.body ?? '',
      android: {
        channelId,
        smallIcon: 'ic_notification', // ensure this resource exists
      },
    });
  } catch (err) {
    console.warn('[FCM] background display error', err);
  }
});

AppRegistry.registerComponent(appName, () => App);
