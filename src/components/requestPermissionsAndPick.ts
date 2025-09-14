import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * requestPermissionsAndPick
 * - Requests CAMERA + gallery read permission (handles Android 13+)
 * - Shows alert with Camera / Gallery options only if permission is available
 * - If permission was denied permanently, offers to open App Settings
 *
 * Usage:
 *   await requestPermissionsAndPick(openCamera, onPickImagePress, showToast)
 *
 * openCamera() and onPickImagePress() are callbacks that actually open the camera / gallery.
 */
const requestPermissionsAndPick = async (
  openCamera: () => void,
  onPickImagePress: () => void,
  showToast?: (msg: string) => void,
): Promise<boolean> => {
  // only Android needs runtime permission requests here
  if (Platform.OS !== 'android') {
    // on iOS the system will prompt automatically when you attempt to access camera/library
    // so just show the same picker options to the user
    Alert.alert(
      'Select Option',
      'Choose an image source',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => onPickImagePress() },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
    return true;
  }

  try {
    // Android 13+ uses READ_MEDIA_IMAGES; older versions use READ_EXTERNAL_STORAGE
    const galleryPermission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const wanted = [PermissionsAndroid.PERMISSIONS.CAMERA, galleryPermission];

    const granted = await PermissionsAndroid.requestMultiple(wanted);

    const cameraAllowed = granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
    const galleryAllowed = granted[galleryPermission] === PermissionsAndroid.RESULTS.GRANTED;

    const cameraBlocked =
      granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
    const galleryBlocked = granted[galleryPermission] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

    // If none granted
    if (!cameraAllowed && !galleryAllowed) {
      if (cameraBlocked || galleryBlocked) {
        // Suggest opening settings
        Alert.alert(
          'Permission required',
          'Camera and/or Gallery permission is required. Please enable them in Settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ],
          { cancelable: true },
        );
      } else {
        // simple toast message
        showToast?.('Permission denied — enable camera or gallery permission to upload an image.');
      }
      return false;
    }

    // Build the action buttons depending on granted permissions
    const options: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [];

    if (cameraAllowed) {
      options.push({ text: 'Camera', onPress: () => openCamera() });
    } else {
      // Offer to open settings if camera permission not allowed and user selected never ask again
      options.push({
        text: 'Camera (requires permission)',
        onPress: () => {
          if (cameraBlocked) {
            Linking.openSettings();
          } else {
            showToast?.('Camera permission required');
          }
        },
      });
    }

    if (galleryAllowed) {
      options.push({ text: 'Gallery', onPress: () => onPickImagePress() });
    } else {
      options.push({
        text: 'Gallery (requires permission)',
        onPress: () => {
          if (galleryBlocked) {
            Linking.openSettings();
          } else {
            showToast?.('Gallery permission required');
          }
        },
      });
    }

    // Always include Cancel as last option
    options.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' });

    Alert.alert('Select Option', 'Choose an image source', options, { cancelable: true });

    return true;
  } catch (err) {
    console.warn('requestPermissionsAndPick err', err);
    showToast?.('Something went wrong, try again later');
    return false;
  }
};

export default requestPermissionsAndPick;
