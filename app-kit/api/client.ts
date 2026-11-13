/**
 * The app's one way of talking to the API. It is plain TypeScript (no React Native imports) so
 * its trickiest part, refreshing an expired login, can be unit tested.
 *
 * Behaviour:
 *  - Adds the access token to every request that needs one.
 *  - On 401 for an expired token it refreshes once (even if ten requests fail at the same
 *    moment), then repeats the request. Refresh tokens are single use on the server, so two
 *    parallel refreshes would log the user out.
 *  - If the refresh token itself is rejected, the session is over: onSessionExpired() runs.
 *  - A network failure never logs anyone out. Only the server saying "no" does.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the request never got an answer (offline, server down, timed out). */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR';
export const TIMEOUT_ERROR = 'TIMEOUT';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** How the client reads and changes the logged in session, without knowing where it lives. */
export interface SessionBridge {
  getTokens(): Tokens | null;
  setTokens(tokens: Tokens): void | Promise<void>;
  /** The server refused the refresh token or the account was disabled. Log the user out. */
  onSessionExpired(): void;
}

export interface ApiClientOptions {
  /** A function, so the address can be worked out lazily (it depends on the Expo dev server). */
  baseUrl: () => string;
  bridge: () => SessionBridge;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the access token and refresh it when it has expired. Default true. */
  auth?: boolean;
}

// A 401 with one of these codes means "your access token is no good", which a refresh can fix.
const REFRESHABLE = new Set(['INVALID_TOKEN', 'UNAUTHENTICATED']);
// The server says the account itself is switched off: refreshing will not help.
const SESSION_ENDING = new Set(['ACCOUNT_DISABLED']);

/** The server said no to the refresh token (as opposed to being unreachable or having a bad moment). */
function isSessionRefusal(error: unknown): boolean {
  return error instanceof ApiError && !error.isNetwork && error.status < 500;
}

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  let refreshing: Promise<Tokens> | null = null;

  async function send<T>(
    path: string,
    opts: RequestOptions,
    accessToken: string | null,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' };
    // A FormData body (a picture upload) sets its own content type with the multipart boundary.
    const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
    if (opts.body !== undefined && !isForm) headers['content-type'] = 'application/json';
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;

    // Worked out before the try block: a configuration mistake must not look like a network failure.
    const url = `${options.baseUrl().replace(/\/+$/, '')}${path}`;

    const controller = new AbortController();
    let timedOut = false;
    // Uploads get more time than ordinary requests: a phone photo on a slow connection.
    const timer = setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      isForm ? Math.max(timeoutMs, 60_000) : timeoutMs,
    );

    let response: Response;
    try {
      response = await doFetch(url, {
        method: opts.method ?? 'GET',
        headers,
        body:
          opts.body === undefined
            ? undefined
            : isForm
              ? (opts.body as FormData)
              : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch {
      throw timedOut
        ? new ApiError(
            0,
            TIMEOUT_ERROR,
            'The server is taking too long to answer. Please try again',
          )
        : new ApiError(0, NETWORK_ERROR, 'Cannot reach the server. Check your internet connection');
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text().catch(() => '');
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        // Not JSON (for example an HTML error page from a proxy). Treated as "no body".
      }
    }

    if (!response.ok) {
      const error = (json as { error?: { code?: string; message?: string } } | null)?.error;
      throw new ApiError(
        response.status,
        error?.code ?? 'REQUEST_FAILED',
        error?.message ?? 'Something went wrong. Please try again',
      );
    }
    return json as T;
  }

  /** One refresh at a time. Everyone who needs it waits for the same answer. */
  function refreshTokens(): Promise<Tokens> {
    refreshing ??= (async () => {
      const current = options.bridge().getTokens();
      if (!current) {
        options.bridge().onSessionExpired();
        throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in');
      }
      let result: Tokens;
      try {
        result = await send<Tokens>(
          '/auth/refresh',
          { method: 'POST', body: { refreshToken: current.refreshToken } },
          null,
        );
      } catch (error) {
        // Reported here, once, however many requests are waiting on this refresh.
        if (isSessionRefusal(error)) options.bridge().onSessionExpired();
        throw error;
      }
      const next = { accessToken: result.accessToken, refreshToken: result.refreshToken };
      await options.bridge().setTokens(next);
      return next;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const needsAuth = opts.auth !== false;
    const used = needsAuth ? (options.bridge().getTokens()?.accessToken ?? null) : null;

    try {
      return await send<T>(path, opts, used);
    } catch (error) {
      if (!(error instanceof ApiError) || !needsAuth) throw error;

      if (SESSION_ENDING.has(error.code)) {
        options.bridge().onSessionExpired();
        throw error;
      }
      if (error.status !== 401 || !REFRESHABLE.has(error.code)) throw error;

      // Someone else may already have refreshed while this request was in flight.
      const latest = options.bridge().getTokens();
      let retryWith = latest && latest.accessToken !== used ? latest.accessToken : null;

      if (!retryWith) {
        try {
          retryWith = (await refreshTokens()).accessToken;
        } catch (refreshError) {
          // If the server refused the refresh token the login is over, and the caller gets the
          // original 401. Anything else (no network, a server hiccup) is only a failed attempt.
          if (isSessionRefusal(refreshError)) throw error;
          throw refreshError;
        }
      }
      // Tried once with the fresh token. If that fails too, the failure is real.
      return send<T>(path, opts, retryWith);
    }
  }

  return { request, refreshTokens };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** A short, friendly sentence for any error, for showing on screen. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again';
}
