import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, errorMessage, type SessionBridge, type Tokens } from './client';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const apiError = (status: number, code: string, message = code) =>
  json(status, { error: { code, message } });

/** A client wired to a fake server and an in-memory session. */
function setup(
  handler: Handler,
  start: Tokens | null = { accessToken: 'old-access', refreshToken: 'old-refresh' },
) {
  let tokens = start;
  const expired = vi.fn();
  const requests: { url: string; init: RequestInit }[] = [];
  const bridge: SessionBridge = {
    getTokens: () => tokens,
    setTokens: (next) => {
      tokens = next;
    },
    onSessionExpired: () => {
      tokens = null;
      expired();
    },
  };
  const fetchImpl = (async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: () => 'http://api.test/',
    bridge: () => bridge,
    fetchImpl,
    timeoutMs: 200,
  });
  return { client, expired, requests, tokens: () => tokens };
}

const auth = (init: RequestInit) => (init.headers as Record<string, string>).authorization;
const refreshCalls = (requests: { url: string }[]) =>
  requests.filter((r) => r.url.endsWith('/auth/refresh')).length;

describe('basic requests', () => {
  it('sends the access token and the JSON body, with no double slash in the URL', async () => {
    const { client, requests } = setup(() => json(200, { ok: true }));
    await client.request('/me', { method: 'PATCH', body: { name: 'Asha' } });
    expect(requests[0]?.url).toBe('http://api.test/me');
    expect(requests[0]?.init.method).toBe('PATCH');
    expect(auth(requests[0]!.init)).toBe('Bearer old-access');
    expect(requests[0]?.init.body).toBe('{"name":"Asha"}');
  });

  it('sends no token when auth is switched off', async () => {
    const { client, requests } = setup(() => json(200, {}));
    await client.request('/auth/otp/methods', { auth: false });
    expect(auth(requests[0]!.init)).toBeUndefined();
  });

  it('turns the server error shape into an ApiError', async () => {
    const { client } = setup(() => apiError(422, 'OUT_OF_RANGE', 'Too far'), null);
    const error = await client
      .request('/cart/quote', { method: 'POST', body: {} })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'OUT_OF_RANGE',
      message: 'Too far',
      isNetwork: false,
    });
  });

  it('gives a friendly message when the body is not the usual error shape', async () => {
    const { client } = setup(() => new Response('<html>Bad gateway</html>', { status: 502 }), null);
    const error = (await client.request('/x').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.message).not.toContain('<html>');
  });

  it('reports no connection as a network error', async () => {
    const { client } = setup(() => {
      throw new TypeError('Network request failed');
    });
    const error = (await client.request('/me').catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', isNetwork: true });
    expect(errorMessage(error)).toMatch(/cannot reach the server/i);
  });

  it('gives up on a server that never answers', async () => {
    const { client } = setup(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const error = (await client.request('/me').catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 0, code: 'TIMEOUT' });
  });

  it('describes unknown errors without leaking details', () => {
    expect(errorMessage(new Error('secret internals'))).toBe(
      'Something went wrong. Please try again',
    );
  });
});

describe('refreshing an expired login', () => {
  /** A server where /me needs the new token and /auth/refresh hands it out. */
  function server(options: { refresh?: () => Response } = {}) {
    return (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        return (
          options.refresh?.() ??
          json(200, { accessToken: 'new-access', refreshToken: 'new-refresh', user: {} })
        );
      }
      return auth(init) === 'Bearer new-access'
        ? json(200, { user: 'me' })
        : apiError(401, 'INVALID_TOKEN');
    };
  }

  it('refreshes once and repeats the request', async () => {
    const { client, requests, tokens, expired } = setup(server());
    const result = await client.request<{ user: string }>('/me');
    expect(result.user).toBe('me');
    expect(refreshCalls(requests)).toBe(1);
    expect(requests.map((r) => r.url.replace('http://api.test', ''))).toEqual([
      '/me',
      '/auth/refresh',
      '/me',
    ]);
    expect(tokens()).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    expect(expired).not.toHaveBeenCalled();
  });

  it('sends the refresh token without an access token', async () => {
    const { client, requests } = setup(server());
    await client.request('/me');
    const refresh = requests.find((r) => r.url.endsWith('/auth/refresh'))!;
    expect(auth(refresh.init)).toBeUndefined();
    expect(refresh.init.body).toBe('{"refreshToken":"old-refresh"}');
  });

  it('ten requests failing at once cause exactly one refresh', async () => {
    const { client, requests, expired } = setup(server());
    const results = await Promise.all(
      Array.from({ length: 10 }, () => client.request<{ user: string }>('/me')),
    );
    expect(results.every((r) => r.user === 'me')).toBe(true);
    expect(refreshCalls(requests)).toBe(1);
    expect(expired).not.toHaveBeenCalled();
  });

  it('a request that failed with the old token just retries when a refresh already happened', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { client, requests } = setup(async (url, init) => {
      if (url.endsWith('/auth/refresh'))
        return json(200, { accessToken: 'new-access', refreshToken: 'new-refresh' });
      if (url.endsWith('/slow')) await gate; // answers 401 only after the refresh below has finished
      return auth(init) === 'Bearer new-access'
        ? json(200, { ok: true })
        : apiError(401, 'INVALID_TOKEN');
    });
    const slow = client.request('/slow'); // starts with the old token
    await client.request('/fast'); // fails, refreshes, succeeds
    release();
    await slow; // fails with the old token, notices the new one, retries without refreshing again
    expect(refreshCalls(requests)).toBe(1);
  });

  it('ends the session when the refresh token is refused, and reports the original failure', async () => {
    const { client, expired, tokens } = setup(
      server({ refresh: () => apiError(401, 'INVALID_REFRESH_TOKEN') }),
    );
    const error = (await client.request('/me').catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 401, code: 'INVALID_TOKEN' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(tokens()).toBeNull();
  });

  it('ten failing requests with a dead session end it once', async () => {
    const { client, expired } = setup(
      server({ refresh: () => apiError(401, 'INVALID_REFRESH_TOKEN') }),
    );
    await Promise.allSettled(Array.from({ length: 10 }, () => client.request('/me')));
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('does NOT log out when the network is down during the refresh', async () => {
    const { client, expired, tokens } = setup((url) => {
      if (url.endsWith('/auth/refresh')) throw new TypeError('offline');
      return apiError(401, 'INVALID_TOKEN');
    });
    const error = (await client.request('/me').catch((e: unknown) => e)) as ApiError;
    expect(error.isNetwork).toBe(true);
    expect(expired).not.toHaveBeenCalled();
    expect(tokens()).toEqual({ accessToken: 'old-access', refreshToken: 'old-refresh' });
  });

  it('does NOT log out when the server is having a bad moment during the refresh', async () => {
    const { client, expired } = setup(
      server({ refresh: () => apiError(503, 'NO_OTP_METHOD_AVAILABLE') }),
    );
    const error = (await client.request('/me').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(503);
    expect(expired).not.toHaveBeenCalled();
  });

  it('tries only once: a second 401 after refreshing is returned, not looped on', async () => {
    const { client, requests } = setup((url) =>
      url.endsWith('/auth/refresh')
        ? json(200, { accessToken: 'new-access', refreshToken: 'new-refresh' })
        : apiError(401, 'INVALID_TOKEN'),
    );
    const error = (await client.request('/me').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(401);
    expect(requests).toHaveLength(3); // request, refresh, one retry
  });

  it('does not try to refresh for calls that carry no login (a wrong OTP is also a 401)', async () => {
    const { client, requests, expired } = setup(() =>
      apiError(401, 'INVALID_OTP', 'Incorrect OTP. 4 attempts left'),
    );
    const error = (await client
      .request('/auth/otp/verify', { method: 'POST', auth: false, body: {} })
      .catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 401, code: 'INVALID_OTP' });
    expect(refreshCalls(requests)).toBe(0);
    expect(expired).not.toHaveBeenCalled();
  });

  it('does not refresh for other 401s on a logged in call, such as a wrong-role refusal', async () => {
    const { client, requests } = setup(() => apiError(403, 'FORBIDDEN'));
    await client.request('/admin/ping').catch(() => undefined);
    expect(refreshCalls(requests)).toBe(0);
  });

  it('logs out at once when the account has been disabled', async () => {
    const { client, expired, requests } = setup(() => apiError(403, 'ACCOUNT_DISABLED'));
    await client.request('/me').catch(() => undefined);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(refreshCalls(requests)).toBe(0);
  });

  it('a logged in call with no saved tokens fails cleanly instead of crashing', async () => {
    const { client, expired } = setup(() => apiError(401, 'UNAUTHENTICATED'), null);
    const error = (await client.request('/me').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(401);
    expect(expired).toHaveBeenCalledTimes(1);
  });
});

describe('configuration mistakes', () => {
  it('are not mistaken for a network failure', async () => {
    const client = createApiClient({
      baseUrl: () => {
        throw new Error('The API address is not set');
      },
      bridge: () => ({
        getTokens: () => null,
        setTokens: () => undefined,
        onSessionExpired: () => undefined,
      }),
      fetchImpl: (() => Promise.resolve(json(200, {}))) as unknown as typeof fetch,
    });
    const error = await client.request('/me', { auth: false }).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).message).toContain('API address is not set');
  });
});
