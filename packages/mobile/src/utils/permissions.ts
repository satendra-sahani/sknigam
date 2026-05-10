import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Runtime permission helpers for camera + gallery.
 *
 * Why this exists:
 *  - The Android manifest declares CAMERA / READ_MEDIA_IMAGES, but on
 *    targetSdk 34 the OS will not grant them automatically — we must call
 *    PermissionsAndroid.request() the first time the user actually tries to
 *    capture/pick a photo.
 *  - react-native-image-picker can silently fail with `errorCode: permission`
 *    if we skip this step, which looks like "the camera button is broken"
 *    to field staff. Calling here is more honest.
 *  - If the user has previously chosen "Don't ask again", we point them to
 *    the system Settings screen via `Linking.openSettings()` instead of
 *    re-prompting (which would do nothing).
 *
 * iOS path is a no-op because react-native-image-picker handles iOS
 * permissions itself via Info.plist usage descriptions.
 */

type AndroidPermission =
  | 'CAMERA'
  | 'READ_MEDIA_IMAGES'
  | 'READ_EXTERNAL_STORAGE';

type Outcome = 'granted' | 'denied' | 'blocked';

async function requestAndroid(
  permission: AndroidPermission,
  title: string,
  message: string,
): Promise<Outcome> {
  try {
    const perm = (PermissionsAndroid.PERMISSIONS as any)[permission];
    if (!perm) return 'denied';

    const already = await PermissionsAndroid.check(perm);
    if (already) return 'granted';

    const result = await PermissionsAndroid.request(perm, {
      title,
      message,
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
    return 'denied';
  } catch {
    return 'denied';
  }
}

function showBlockedAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

export async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const outcome = await requestAndroid(
    'CAMERA',
    'Camera access',
    'POLLSTICS uses your camera only when you tap "Camera" to capture a voter photo at the doorstep.',
  );
  if (outcome === 'granted') return true;
  if (outcome === 'blocked') {
    showBlockedAlert(
      'Camera blocked',
      'Camera permission was permanently denied. Open Settings → Permissions → Camera to enable it.',
    );
  }
  return false;
}

export async function ensureGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Android 13+ uses the system Photo Picker which does NOT require a
  // runtime permission, so don't bother prompting and creating noise.
  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);
  if (apiLevel >= 33) return true;

  const outcome = await requestAndroid(
    'READ_EXTERNAL_STORAGE',
    'Photo library access',
    'POLLSTICS needs access to your photos so you can attach an existing image to a voter visit.',
  );
  if (outcome === 'granted') return true;
  if (outcome === 'blocked') {
    showBlockedAlert(
      'Photo library blocked',
      'Photo permission was permanently denied. Open Settings → Permissions → Photos to enable it.',
    );
  }
  return false;
}
