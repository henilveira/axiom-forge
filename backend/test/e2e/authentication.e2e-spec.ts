import { randomUUID } from 'node:crypto';
import {
  TEST_AUTH_E2E_TIMEOUT_MS,
  TEST_PASSWORD,
} from '../test-kit/authentication.constants';

const baseUrl = process.env['AUTH_E2E_BASE_URL'];

interface HttpResult {
  readonly response: Response;
  readonly body: unknown;
}

if (baseUrl === undefined || baseUrl.trim().length === 0) {
  it('BLOCKED AUTH-001 E2E: AUTH_E2E_BASE_URL is required', () => {
    expect('BLOCKED AUTH-001 E2E').toContain('BLOCKED');
    throw new Error(
      'BLOCKED AUTH-001 E2E: configure AUTH_E2E_BASE_URL for the running authentication service',
    );
  });
} else {
  describe('AUTH-001 real HTTP authentication journeys', () => {
    const origin = new URL(baseUrl).origin;
    const email = `auth001-e2e-${randomUUID()}@example.test`;
    const termsVersion = process.env['AUTH_E2E_TERMS_VERSION'] ?? 'v1';

    beforeAll(() => {
      if (!/^https?:$/.test(new URL(baseUrl).protocol)) {
        throw new Error('BLOCKED AUTH-001 E2E: base URL must use HTTP(S)');
      }
    });

    it(
      'exercises real registration, verification error, login error and magic-link non-enumeration',
      async () =>
        await exercisePublicAuthenticationErrors(baseUrl, email, termsVersion),
      TEST_AUTH_E2E_TIMEOUT_MS,
    );

    it(
      'rejects cookie mutations without origin and CSRF proof on the real service',
      async () => await exerciseCookieAndOAuthErrors(baseUrl),
      TEST_AUTH_E2E_TIMEOUT_MS,
    );

    it(
      'proves Google state/nonce/PKCE and secure session cookies when the E2E fixture is provisioned',
      async () => await exerciseGoogleAndSession(baseUrl, origin),
      TEST_AUTH_E2E_TIMEOUT_MS,
    );
  });
}

async function exercisePublicAuthenticationErrors(
  runningBaseUrl: string,
  email: string,
  termsVersion: string,
): Promise<void> {
  const registration = await call(runningBaseUrl, '/auth/register', {
    method: 'POST',
    body: { email, password: TEST_PASSWORD, termsVersion },
  });
  expect(registration.response.status).toBe(201);
  expect(registration.body).toEqual({ outcome: 'ACCEPTED' });
  expect(JSON.stringify(registration.body)).not.toContain(TEST_PASSWORD);
  expect(JSON.stringify(registration.body)).not.toContain(email);

  const invalidLogin = await call(runningBaseUrl, '/auth/login/password', {
    method: 'POST',
    body: { email, password: 'wrong password used only by test' },
  });
  expect(invalidLogin.response.status).toBe(401);
  expect(publicCode(invalidLogin.body)).toBe('AUTH_FAILED');
  expect(JSON.stringify(invalidLogin.body)).not.toContain(email);

  const unknownMagic = await call(runningBaseUrl, '/auth/magic-link/request', {
    method: 'POST',
    body: { email: `unknown-${randomUUID()}@example.test` },
  });
  expect(unknownMagic.response.status).toBe(201);
  expect(unknownMagic.body).toEqual({ outcome: 'ACCEPTED' });

  const verification = await call(
    runningBaseUrl,
    `/auth/email/verify?token=${encodeURIComponent('invalid-token')}`,
    { method: 'GET' },
  );
  expect(verification.response.status).toBe(200);
  expect(verification.body).toEqual({ outcome: 'REJECTED' });
  expect(verification.response.headers.get('cache-control')).toBe('no-store');
  expect(verification.response.headers.get('referrer-policy')).toBe(
    'no-referrer',
  );

  const invalidMagic = await call(
    runningBaseUrl,
    `/auth/magic-link/consume?token=${encodeURIComponent('invalid-token')}`,
    { method: 'GET' },
  );
  expect(invalidMagic.response.status).toBe(401);
  expect(publicCode(invalidMagic.body)).toBe('AUTH_FAILED');
  expect(JSON.stringify(invalidMagic.body)).not.toContain('invalid-token');
}

async function exerciseCookieAndOAuthErrors(
  runningBaseUrl: string,
): Promise<void> {
  const refresh = await call(runningBaseUrl, '/auth/session/refresh', {
    method: 'POST',
  });
  expect(refresh.response.status).toBe(401);
  // The controller throws AuthenticationError('CSRF_INVALID', 'CSRF_INVALID'),
  // but AUTHENTICATION_PUBLIC_ERROR_CODES maps that domain code to the public
  // wire code 'AUTH_CSRF_REJECTED' (authentication-http.constants.ts). This
  // assertion previously expected the internal code and would have failed
  // against a correct implementation the first time this suite got a real
  // AUTH_E2E_BASE_URL to run against.
  expect(publicCode(refresh.body)).toBe('AUTH_CSRF_REJECTED');

  const logout = await call(runningBaseUrl, '/auth/logout', { method: 'POST' });
  expect(logout.response.status).toBe(401);
  expect(publicCode(logout.body)).toBe('AUTH_CSRF_REJECTED');

  const callback = await call(
    runningBaseUrl,
    `/auth/google/callback?code=${encodeURIComponent('invalid-code')}&state=${encodeURIComponent('invalid-state')}`,
    { method: 'GET' },
  );
  expect(callback.response.status).toBe(400);
  expect(publicCode(callback.body)).toBe('AUTH_FAILED');
  expect(JSON.stringify(callback.body)).not.toContain('invalid-code');
  expect(JSON.stringify(callback.body)).not.toContain('invalid-state');
}

async function exerciseGoogleAndSession(
  runningBaseUrl: string,
  origin: string,
): Promise<void> {
  const start = await call(runningBaseUrl, '/auth/google/start', {
    method: 'GET',
    redirect: 'manual',
  });
  if (start.response.status !== 302) {
    throw new Error(
      `BLOCKED AUTH-001 E2E: Google fixture/provider is not enabled at ${baseUrl}`,
    );
  }
  const location = start.response.headers.get('location');
  if (location === null) {
    throw new Error('Google start did not return an authorization redirect');
  }
  const authorization = new URL(location);
  expect(authorization.searchParams.get('response_type')).toBe('code');
  expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorization.searchParams.get('state')).toBeTruthy();
  expect(authorization.searchParams.get('nonce')).toBeTruthy();
  expect(authorization.searchParams.get('client_secret')).toBeNull();
  expect(authorization.searchParams.get('scope')).toBe('openid email profile');

  const fixtureEmail = process.env['AUTH_E2E_VERIFIED_EMAIL'];
  const fixturePassword = process.env['AUTH_E2E_VERIFIED_PASSWORD'];
  if (fixtureEmail === undefined || fixturePassword === undefined) {
    throw new Error(
      'BLOCKED AUTH-001 E2E: configure AUTH_E2E_VERIFIED_EMAIL and AUTH_E2E_VERIFIED_PASSWORD for session cookie, refresh and logout proof',
    );
  }
  const login = await call(runningBaseUrl, '/auth/login/password', {
    method: 'POST',
    body: { email: fixtureEmail, password: fixturePassword },
  });
  expect(login.response.status).toBe(201);
  const setCookie = login.response.headers.get('set-cookie');
  if (setCookie === null) {
    throw new Error('Successful login did not emit session cookies');
  }
  expect(setCookie).toMatch(/app_session=[^;]+;[^]*HttpOnly/);
  expect(setCookie).toMatch(/app_refresh=[^;]+;[^]*HttpOnly/);
  expect(setCookie).toMatch(/app_csrf=[^;]+/);
  expect(setCookie).toMatch(/SameSite=Lax/);
  expect(setCookie).toMatch(/Path=\//);
  const cookies = cookieHeader(setCookie);
  const csrf = cookieValue(setCookie, 'app_csrf');
  if (csrf === null) {
    throw new Error('Successful login did not emit a CSRF cookie');
  }
  const rotated = await call(runningBaseUrl, '/auth/session/refresh', {
    method: 'POST',
    headers: {
      cookie: cookies,
      origin,
      'x-csrf-token': csrf,
    },
  });
  expect(rotated.response.status).toBe(201);
  const logout = await call(runningBaseUrl, '/auth/logout', {
    method: 'POST',
    headers: {
      cookie: cookieHeader(
        rotated.response.headers.get('set-cookie') ?? setCookie,
      ),
      origin,
      'x-csrf-token': csrf,
    },
  });
  expect(logout.response.status).toBe(201);
  expect(logout.response.headers.get('set-cookie')).toMatch(/app_refresh=;/);
}

async function call(
  runningBaseUrl: string,
  path: string,
  options: {
    readonly method: 'GET' | 'POST';
    readonly body?: Readonly<Record<string, string>>;
    readonly headers?: Readonly<Record<string, string>>;
    readonly redirect?: RequestRedirect;
  },
): Promise<HttpResult> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  let response: Response;
  try {
    response = await fetch(new URL(path, runningBaseUrl), {
      method: options.method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: options.redirect ?? 'manual',
      signal: AbortSignal.timeout(TEST_AUTH_E2E_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    throw new Error(
      `BLOCKED AUTH-001 E2E: HTTP request failed: ${
        error instanceof Error ? error.message : 'unknown network error'
      }`,
    );
  }
  let body: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      const parsed: unknown = JSON.parse(text);
      body = parsed;
    } catch {
      body = text;
    }
  }
  return { response, body };
}

function publicCode(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const code = body['code'];
  return typeof code === 'string' ? code : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cookieValue(setCookie: string, name: string): string | null {
  const match = new RegExp(`${name}=([^;]+)`).exec(setCookie);
  return match?.[1] ?? null;
}

function cookieHeader(setCookie: string): string {
  return setCookie
    .split(/,\s*(?=\w+=)/)
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');
}
