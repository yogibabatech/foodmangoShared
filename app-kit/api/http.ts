import { createApiClient, type SessionBridge } from './client';
import { getApiUrl } from './config';

let bridge: SessionBridge | null = null;

/** The auth store plugs itself in here, so the client never has to import the store. */
export function registerSessionBridge(next: SessionBridge): void {
  bridge = next;
}

/** The app's single API client. */
export const http = createApiClient({
  baseUrl: getApiUrl,
  bridge: () => {
    if (!bridge) throw new Error('Session bridge is not registered');
    return bridge;
  },
});
