import { create } from 'zustand';
import { getMe, logoutOnServer, updateName as updateNameOnServer } from '../api/auth';
import { ApiError, type Tokens } from '../api/client';
import { registerSessionBridge } from '../api/http';
import { unregisterPushToken } from '../api/push';
import type { User, VerifyOtpResult } from '../api/types';
import { clearTokens, loadTokens, saveTokens } from './session-storage';

/**
 *  loading     reading the saved login when the app opens (the splash screen stays up)
 *  signedOut   nobody is logged in
 *  signedIn    logged in, profile loaded
 *  offline     a saved login exists but the server cannot be reached to check it
 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'offline';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  tokens: Tokens | null;
  /** Reads the saved login and loads the profile. Safe to call more than once. */
  bootstrap: () => Promise<void>;
  /** Stores the result of a successful OTP check. */
  signIn: (result: VerifyOtpResult) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}

let bootstrapping: Promise<void> | null = null;

const signOutHooks: (() => void)[] = [];
/** Lets an app clear its own data when someone logs out or the login ends. */
export function onSignOut(hook: () => void): void {
  signOutHooks.push(hook);
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  tokens: null,

  bootstrap() {
    // Strict mode and fast refresh can call this twice. Run it once at a time.
    bootstrapping ??= (async () => {
      set({ status: 'loading' });
      const saved = await loadTokens();
      if (!saved) {
        set({ status: 'signedOut', user: null, tokens: null });
        return;
      }
      set({ tokens: saved });
      try {
        const user = await getMe();
        set({ status: 'signedIn', user });
      } catch (error) {
        const refused = error instanceof ApiError && (error.status === 401 || error.status === 403);
        if (refused) {
          // The server says this login is no good. (The client has usually cleared it already.)
          await endSession();
        } else {
          // No connection, a timeout or a server hiccup: keep the login and let the user retry.
          set({ status: 'offline' });
        }
      }
    })().finally(() => {
      bootstrapping = null;
    });
    return bootstrapping;
  },

  async signIn(result) {
    const tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
    await saveTokens(tokens);
    set({ tokens, user: result.user, status: 'signedIn' });
  },

  async updateName(name) {
    const user = await updateNameOnServer(name);
    set({ user });
  },

  async logout() {
    const refreshToken = get().tokens?.refreshToken;
    // Stop notifications to this phone while we can still prove who we are. A slow or missing
    // connection must not trap the person, so this waits a few seconds at most.
    await Promise.race([
      unregisterPushToken().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    // Sign the user out of the app first, then tell the server. A bad connection must not trap them.
    await endSession();
    if (refreshToken) await logoutOnServer(refreshToken).catch(() => undefined);
  },
}));

async function endSession(): Promise<void> {
  await clearTokens();
  // Each app clears its own data (a cart, saved addresses) so the next person starts empty.
  for (const hook of signOutHooks) hook();
  useAuth.setState({ status: 'signedOut', user: null, tokens: null });
}

// Lets the API client read the tokens, store refreshed ones, and end the session.
registerSessionBridge({
  getTokens: () => useAuth.getState().tokens,
  setTokens: async (tokens) => {
    useAuth.setState({ tokens });
    await saveTokens(tokens);
  },
  onSessionExpired: () => {
    void endSession();
  },
});
