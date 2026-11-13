import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Tokens } from '../api/client';

/**
 * Where the login tokens are kept between app launches.
 *  - On a phone: the system's secure storage (Keychain on iOS, Keystore on Android).
 *  - On the web (only used to try the app in a browser while developing): localStorage.
 *    The browser has no secure storage, so do not treat the web build as production-grade.
 */
const KEY = 'fd.session';

const isWeb = Platform.OS === 'web';

export async function loadTokens(): Promise<Tokens | null> {
  try {
    const raw = isWeb ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Tokens>;
    if (typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string') {
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
    }
    return null;
  } catch {
    return null; // unreadable storage means "not logged in", not a crash
  }
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  const raw = JSON.stringify(tokens);
  try {
    if (isWeb) globalThis.localStorage?.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {
    // The login still works for this session; it just will not survive closing the app.
  }
}

export async function clearTokens(): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing more to do.
  }
}
