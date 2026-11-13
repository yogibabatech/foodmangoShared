import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { pushProjectId } from './push';

/** Why there is no push token. Only "denied" is worth telling the person about. */
export type PushResult =
  { ok: true; token: string } | { ok: false; reason: 'denied' | 'no-project' | 'unavailable' };

type NotificationsModule = typeof import('expo-notifications');
let loaded: NotificationsModule | null | undefined;

/**
 * Loads expo-notifications the first time it is needed. If its native parts are missing (an Expo
 * Go build that does not include them, say) the load throws, and the app must still open: push is
 * a nicety, so every function here then does nothing instead of crashing the whole app.
 */
function notifications(): NotificationsModule | null {
  if (loaded !== undefined) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module: NotificationsModule = require('expo-notifications');
    // While the app is open, still show the notification (banner and notification list).
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    loaded = module;
  } catch {
    loaded = null;
  }
  return loaded;
}

/**
 * Asks permission (once) and returns this phone's Expo push token. Never throws: push is a nicety,
 * and the app must work the same without it (Expo Go on Android cannot receive remote push at all).
 */
export async function getPushToken(): Promise<PushResult> {
  const Notifications = notifications();
  if (!Notifications) return { ok: false, reason: 'unavailable' };
  try {
    if (Platform.OS === 'android') {
      // The channel has to exist before Android 13+ will show the permission prompt.
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Orders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };

    const projectId = pushProjectId(Constants);
    if (!projectId) return { ok: false, reason: 'no-project' };

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { ok: true, token: data };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Calls `onTap` with the data of a notification the person tapped. Returns a way to stop listening. */
export function subscribeToTaps(onTap: (data: unknown) => void): () => void {
  const Notifications = notifications();
  if (!Notifications) return () => undefined;
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      onTap(response.notification.request.content.data);
    }
  });
  return () => subscription.remove();
}

/** The data of the notification that opened the app from a closed state, if any (handled once). */
export async function consumeColdStartTap(): Promise<unknown> {
  const Notifications = notifications();
  if (!Notifications) return null;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return null;
    }
    await Notifications.clearLastNotificationResponseAsync();
    return response.notification.request.content.data;
  } catch {
    return null;
  }
}
