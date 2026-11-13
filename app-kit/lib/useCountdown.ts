import { useCallback, useEffect, useState } from 'react';

/**
 * Counts down whole seconds to zero, for the "Resend code in 24s" line.
 * It works from a deadline, not from counting ticks, so it stays right if the app is paused.
 */
export function useCountdown(initialSeconds: number) {
  const [deadline, setDeadline] = useState(() => Date.now() + initialSeconds * 1000);
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [deadline]);

  const restart = useCallback((next: number) => setDeadline(Date.now() + next * 1000), []);
  return { seconds, restart };
}
