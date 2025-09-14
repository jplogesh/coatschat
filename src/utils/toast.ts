import { ToastAndroid } from 'react-native';

export function showToast(msg: string) {
  ToastAndroid.showWithGravity(msg, ToastAndroid.SHORT, ToastAndroid.BOTTOM);
}
