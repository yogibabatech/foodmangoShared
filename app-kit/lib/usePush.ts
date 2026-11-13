import { useEffect, useRef } from 'react';
import { registerPushToken } from '../api/push';
import type { User } from '../api/types';
import { useAuth } from '../store/auth';
import { consumeColdStartTap, getPushToken, subscribeToTaps } from './pushSetup';

/**
 * Mount once, high up, in every app. While someone is logged in (and has a name) it gives the
 * server this phone's push token. `onTap` runs with the data of a notification the person tapped
 * (also one that opened the app), and decides which screen to open: that part is per app.
 */
export function usePush(onTap: (data: unknown, user: User) => void): void {
  const user = useAuth((s) => (s.status === 'signedIn' ? s.user : null));
  const userId = user?.id ?? null;
  const named = !!user?.name;
  const active = userId !== null && named;

  // The latest handler, without re-subscribing every time the app re-renders.
  const handler = useRef(onTap);
  useEffect(() => {
    handler.current = onTap;
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      const result = await getPushToken();
      if (cancelled || !result.ok) return;
      await registerPushToken(result.token).catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, userId]);

  useEffect(() => {
    if (!active) return;
    const open = (data: unknown) => {
      const current = useAuth.getState().user;
      if (current) handler.current(data, current);
    };
    const stop = subscribeToTaps(open);
    void consumeColdStartTap().then((data) => {
      if (data) open(data);
    });
    return stop;
  }, [active, userId]);
}
