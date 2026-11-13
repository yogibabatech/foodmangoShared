import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;

/**
 * Where the API lives.
 *  1. EXPO_PUBLIC_API_URL from apps/mobile/.env, if set (always wins).
 *  2. In development, the same computer that runs the Expo dev server, on port 3000. Expo already
 *     knows that computer's Wi-Fi address (the one in the QR code), so a phone just works.
 */
export function getApiUrl(): string {
  // Must be written exactly like this: Expo replaces it with the value when the app is bundled.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const hostUri = Constants.expoConfig?.hostUri; // for example "192.168.1.10:8081"
  const host = hostUri?.split(':')[0];
  if (__DEV__ && host) return `http://${host}:${API_PORT}`;

  // Running in a browser during development: the API is on the same computer as the page.
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:${API_PORT}`;
  }

  const message =
    'The API address is not set. Put EXPO_PUBLIC_API_URL=https://your-api in apps/mobile/.env and restart the app.';
  console.error(message);
  throw new Error(message);
}
