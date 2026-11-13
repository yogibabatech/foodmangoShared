import type { PushResult } from './pushSetup';

/** The browser preview has no push: these do nothing, so the rest of the app is the same everywhere. */
export type { PushResult };

export async function getPushToken(): Promise<PushResult> {
  return { ok: false, reason: 'unavailable' };
}

export function subscribeToTaps(onTap: (data: unknown) => void): () => void {
  void onTap;
  return () => undefined;
}

export async function consumeColdStartTap(): Promise<unknown> {
  return null;
}
