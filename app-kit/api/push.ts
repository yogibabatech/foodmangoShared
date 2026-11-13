import { http } from './http';

/** The token this phone last gave the server, so logout can take back exactly that one. */
let registered: string | null = null;

/** Tells the server where to send this person's notifications. */
export async function registerPushToken(token: string): Promise<void> {
  await http.request('/me/push-token', { method: 'PUT', body: { token } });
  registered = token;
}

/** Stops notifications to this phone (logout). Best effort: a bad connection must not block logout. */
export async function unregisterPushToken(): Promise<void> {
  const token = registered;
  registered = null;
  if (!token) return;
  await http.request('/me/push-token', { method: 'DELETE', body: { token } });
}
