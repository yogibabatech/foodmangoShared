import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;

let configuredUrl: string | undefined;

/**
 * Each app calls this once at startup with its EXPO_PUBLIC_API_URL. Expo fills in EXPO_PUBLIC_
 * values only in the app's own files, not in installed packages like this one, so the app has to
 * hand the value over:  setApiUrl(process.env.EXPO_PUBLIC_API_URL)
 */
export function setApiUrl(url: string | undefined): void {
  configuredUrl = url?.trim() || undefined;
}

/**
 * Where the API lives.
 *  1. The address the app gave to setApiUrl (its EXPO_PUBLIC_API_URL), if set (always wins).
 *  2. In development, the same computer that runs the Expo dev server, on port 3000. Expo already
 *     knows that computer's Wi-Fi address (the one in the QR code), so a phone just works.
 */
export function getApiUrl(): string {
  if (configuredUrl) return configuredUrl;

  const hostUri = Constants.expoConfig?.hostUri; // for example "192.168.1.10:8081"
  const host = hostUri?.split(':')[0];
  if (__DEV__ && host) return `http://${host}:${API_PORT}`;

  // Running in a browser during development: the API is on the same computer as the page.
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:${API_PORT}`;
  }

  const message =
    "The API address is not set. Put EXPO_PUBLIC_API_URL=https://your-api in the app's .env (or eas.json) and restart the app.";
  console.error(message);
  throw new Error(message);
}
