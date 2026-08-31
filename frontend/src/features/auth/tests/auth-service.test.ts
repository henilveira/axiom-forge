import { describe, expect, it, vi } from "vitest";

import { AuthService, AuthServiceError } from "@auth/services/auth-service";
import { navigateToGoogleStart, navigateToMagicConsume } from "@auth/services/auth-navigation";
const OK = 200;
const CREATED = 201;
const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;
const SERVICE_UNAVAILABLE = 503;
const INTERNAL_ERROR = 500;

const response = (body: unknown, status = OK): Response => new Response(JSON.stringify(body), { status });
const successFetch = (): Promise<Response> => Promise.resolve(response({ outcome: "SUCCESS" }, CREATED));
const failedLoginResponse = (): Promise<Response> => Promise.resolve(response({ code: "AUTH_FAILED" }, UNAUTHORIZED));

function nativeFetchWithReceiver(this: unknown, input: Parameters<typeof fetch>[0]): ReturnType<typeof fetch> {
  if (this !== globalThis) throw new TypeError("Illegal invocation");
  let path: string;
  if (typeof input === "string") path = input;
  else if (input instanceof URL) path = input.href;
  else path = input.url;
  const body = path.includes("magic-link") ? { outcome: "ACCEPTED" } : { outcome: "SUCCESS" };
  return Promise.resolve(response(body, CREATED));
}

async function expectContract(
  execute: (service: AuthService) => Promise<unknown>,
  contract: { path: string; requestBody: unknown; responseBody: unknown; protectedRequest: boolean; expectedStatus: number },
): Promise<void> {
  const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response(contract.responseBody, contract.expectedStatus)));
  await execute(new AuthService(fetcher, () => "csrf-dynamic"));
  const [calledPath, init] = fetcher.mock.calls[0] ?? [];
  expectPath(calledPath, contract.path);
  expect(init?.method).toBe(contract.path.includes("email/verify") ? "GET" : "POST");
  expect(init?.credentials).toBe("include");
  expect(init?.cache).toBe("no-store");
  expectBody(init?.body, contract.requestBody);
  expect(new Headers(init?.headers).get("x-csrf-token")).toBe(contract.protectedRequest ? "csrf-dynamic" : null);
}

function expectPath(path: Parameters<typeof fetch>[0] | undefined, expectedPath: string): void {
  if (typeof path !== "string") throw new Error("expected a string request path");
  expect(path).toBe(expectedPath);
}

function expectBody(body: BodyInit | null | undefined, expectedBody: unknown): void {
  expect(body).toBe(expectedBody === undefined ? undefined : JSON.stringify(expectedBody));
}

function requireDefined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("expected mock call");
  return value;
}

function register(service: AuthService): Promise<unknown> {
  return service.register({ email: "ana@example.com", password: "secret", termsVersion: "v1" });
}

function verify(service: AuthService): Promise<unknown> {
  return service.verifyEmail("verify token");
}

function login(service: AuthService): Promise<unknown> {
  return service.passwordLogin({ email: "ana@example.com", password: "secret" });
}

function magicRequest(service: AuthService): Promise<unknown> {
  return service.requestMagicLink({ email: "ana@example.com" });
}

function googleLink(service: AuthService): Promise<unknown> {
  return service.googleLink({ password: "secret" });
}

function refresh(service: AuthService): Promise<unknown> {
  return service.refresh();
}

function logout(service: AuthService): Promise<unknown> {
  return service.logout();
}

describe("AuthService", () => {
  it("sends register contract", () => expectContract(register, { path: "/auth/register", requestBody: { email: "ana@example.com", password: "secret", termsVersion: "v1" }, responseBody: { outcome: "ACCEPTED" }, protectedRequest: false, expectedStatus: CREATED }));
  it("sends verify contract", () => expectContract(verify, { path: "/auth/email/verify?token=verify%20token", requestBody: undefined, responseBody: { outcome: "ACCEPTED" }, protectedRequest: false, expectedStatus: OK }));
  it("sends login contract", () => expectContract(login, { path: "/auth/login/password", requestBody: { email: "ana@example.com", password: "secret" }, responseBody: { outcome: "SUCCESS" }, protectedRequest: false, expectedStatus: CREATED }));
  it("sends magic request contract", () => expectContract(magicRequest, { path: "/auth/magic-link/request", requestBody: { email: "ana@example.com" }, responseBody: { outcome: "ACCEPTED" }, protectedRequest: false, expectedStatus: CREATED }));
  it("sends Google link contract", () => expectContract(googleLink, { path: "/auth/google/link", requestBody: { password: "secret" }, responseBody: { outcome: "SUCCESS" }, protectedRequest: true, expectedStatus: CREATED }));
  it("sends refresh contract", () => expectContract(refresh, { path: "/auth/session/refresh", requestBody: undefined, responseBody: { outcome: "SUCCESS" }, protectedRequest: true, expectedStatus: CREATED }));
  it("sends logout contract", () => expectContract(logout, { path: "/auth/logout", requestBody: undefined, responseBody: { outcome: "ACCEPTED" }, protectedRequest: true, expectedStatus: CREATED }));

  it("maps public errors while preserving status and code", async () => {
    const service = new AuthService(() => Promise.resolve(response({ code: "AUTH_FAILED" }, UNAUTHORIZED)), () => "csrf-now");
    await expect(service.logout()).rejects.toMatchObject({ status: UNAUTHORIZED, code: "AUTH_FAILED" });
  });

  it("retries refresh exactly once with a freshly read CSRF token", async () => {
    let csrf = "csrf-first";
    const csrfReader = vi.fn(() => csrf);
    let attempt = 0;
    const fetcher = vi.fn<typeof fetch>(() => {
      attempt += 1;
      if (attempt === 1) return Promise.resolve(response({ code: "AUTH_CSRF_REJECTED" }, UNAUTHORIZED));
      return Promise.resolve(response({ outcome: "SUCCESS" }, CREATED));
    });
    const service = new AuthService(fetcher, csrfReader);

    const request = service.refresh();
    csrf = "csrf-second";
    await request;

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(csrfReader).toHaveBeenCalledTimes(2);
    const firstCall = requireDefined(fetcher.mock.calls[0]);
    const secondCall = requireDefined(fetcher.mock.calls[1]);
    expect(new Headers(firstCall[1]?.headers).get("x-csrf-token")).toBe("csrf-first");
    expect(new Headers(secondCall[1]?.headers).get("x-csrf-token")).toBe("csrf-second");
    expect(firstCall[1]?.credentials).toBe("include");
    expect(secondCall[1]?.credentials).toBe("include");
    expect(firstCall[1]?.cache).toBe("no-store");
    expect(secondCall[1]?.cache).toBe("no-store");
  });

  it("does not retry Google link after AUTH_CSRF_REJECTED", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response({ code: "AUTH_CSRF_REJECTED" }, UNAUTHORIZED)));
    const service = new AuthService(fetcher, () => "csrf-now");

    await expect(service.googleLink({ password: "secret" })).rejects.toMatchObject({ status: UNAUTHORIZED, code: "AUTH_CSRF_REJECTED" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not retry logout after AUTH_CSRF_REJECTED", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response({ code: "AUTH_CSRF_REJECTED" }, UNAUTHORIZED)));
    const service = new AuthService(fetcher, () => "csrf-now");

    await expect(service.logout()).rejects.toMatchObject({ status: UNAUTHORIZED, code: "AUTH_CSRF_REJECTED" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-CSRF protected errors", async () => {
    for (const [status, code] of [[UNAUTHORIZED, "AUTH_FAILED"], [TOO_MANY_REQUESTS, "AUTH_RATE_LIMITED"], [SERVICE_UNAVAILABLE, "AUTH_UNAVAILABLE"]] as const) {
      const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response({ code }, status)));
      const service = new AuthService(fetcher, () => "csrf-now");

      await expect(service.refresh()).rejects.toMatchObject({ status, code });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });

  it("does not retry refresh more than once when the retry fails", async () => {
    let attempt = 0;
    const fetcher = vi.fn<typeof fetch>(() => {
      attempt += 1;
      return Promise.resolve(response({ code: attempt === 1 ? "AUTH_CSRF_REJECTED" : "AUTH_FAILED" }, UNAUTHORIZED));
    });
    const service = new AuthService(fetcher, () => "csrf-now");

    await expect(service.refresh()).rejects.toMatchObject({ status: UNAUTHORIZED, code: "AUTH_FAILED" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("maps a response body that cannot be parsed as JSON to a safe unavailable error", async () => {
    const invalidJson = new Response("<html>gateway error</html>", { status: SERVICE_UNAVAILABLE, headers: { "content-type": "text/html" } });
    const service = new AuthService(() => Promise.resolve(invalidJson));

    await expect(service.register({ email: "ana@example.com", password: "secret", termsVersion: "v1" })).rejects.toEqual(new AuthServiceError(SERVICE_UNAVAILABLE, "AUTH_UNAVAILABLE"));
  });

  it("rejects an otherwise valid JSON response with an incompatible status", async () => {
    const service = new AuthService(() => Promise.resolve(response({ outcome: "ACCEPTED" }, OK)));

    await expect(service.register({ email: "ana@example.com", password: "secret", termsVersion: "v1" })).rejects.toEqual(new AuthServiceError(OK, "AUTH_UNAVAILABLE"));
  });

  it("reads CSRF for each protected call", async () => {
    let current = "first";
    const csrf = vi.fn(() => current);
    let firstInit: RequestInit | undefined;
    let secondInit: RequestInit | undefined;
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      void input;
      if (firstInit === undefined) firstInit = init;
      else secondInit = init;
      return successFetch();
    });
    const service = new AuthService(fetcher, csrf);
    await service.refresh();
    current = "second";
    await service.refresh();
    expect(csrf).toHaveBeenCalledTimes(2);
    expect(new Headers(firstInit?.headers).get("x-csrf-token")).toBe("first");
    expect(new Headers(secondInit?.headers).get("x-csrf-token")).toBe("second");
  });

  it("reads a changed CSRF token before each protected request", async () => {
    let token = "csrf-1";
    const csrfReader = vi.fn(() => token);
    const fetcher = vi.fn<typeof fetch>((path) => {
      const requestPath = typeof path === "string" ? path : "";
      return Promise.resolve(response(requestPath.includes("logout") ? { outcome: "ACCEPTED" } : { outcome: "SUCCESS" }, CREATED));
    });
    const service = new AuthService(fetcher, csrfReader);
    await service.refresh();
    token = "csrf-2";
    await service.logout();
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
    expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-2");
  });

  it("rejects an invalid public error payload with a safe unavailable code", async () => {
    const service = new AuthService(() => Promise.resolve(response({ internal: "detail" }, INTERNAL_ERROR)));
    await expect(service.refresh()).rejects.toEqual(new AuthServiceError(INTERNAL_ERROR, "AUTH_UNAVAILABLE"));
  });

});

describe("AuthService transport", () => {
  it("binds the native fetch receiver for password and magic-link requests", async () => {
    const originalFetch = globalThis.fetch;
    const nativeFetch = vi.fn<typeof fetch>(nativeFetchWithReceiver);
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const service = new AuthService(undefined, () => undefined);
      await service.passwordLogin({ email: "ana@example.com", password: "secret" });
      await service.requestMagicLink({ email: "ana@example.com" });

      expect(nativeFetch).toHaveBeenCalledTimes(2);
      expect(nativeFetch.mock.calls[0]?.[0]).toBe("/auth/login/password");
      expect(nativeFetch.mock.calls[1]?.[0]).toBe("/auth/magic-link/request");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("keeps the login request same-origin and preserves applicable contract status", async () => {
    const fetcher = vi.fn<typeof fetch>(failedLoginResponse);
    const service = new AuthService(fetcher, () => "csrf-now");

    await expect(service.passwordLogin({ email: "ana@example.com", password: "secret" })).rejects.toEqual(
      new AuthServiceError(UNAUTHORIZED, "AUTH_FAILED"),
    );

    const [path, init] = fetcher.mock.calls[0] ?? [];
    expect(typeof path).toBe("string");
    if (typeof path === "string") {
      expect(path.startsWith("/auth/")).toBe(true);
      expect(() => new URL(path)).toThrow();
    }
    expect(init?.credentials).toBe("include");
    expect(init?.cache).toBe("no-store");
  });

  it("keeps session cookies and tokens browser-managed", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response({ outcome: "SUCCESS" }, CREATED)));
    const service = new AuthService(fetcher);

    await service.passwordLogin({ email: "ana@example.com", password: "secret" });

    const request = fetcher.mock.calls[0];
    expect(request?.[0]).toBe("/auth/login/password");
    const headers = new Headers(request?.[1]?.headers);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("cookie")).toBeNull();
  });

  it("does not forge the browser-managed Origin header", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response({ outcome: "SUCCESS" }, CREATED)));
    const service = new AuthService(fetcher, () => "csrf-now");

    await service.refresh();

    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(headers.get("origin")).toBeNull();
    expect(headers.get("x-csrf-token")).toBe("csrf-now");
  });
});

describe("Auth navigation", () => {
  it("does not fetch navigation-only Google and magic flows", () => {
    const fetcher = vi.fn<typeof fetch>();
    const assign = vi.fn();
    navigateToGoogleStart(assign);
    navigateToMagicConsume("a token", assign);
    expect(fetcher).not.toHaveBeenCalled();
    expect(assign).toHaveBeenNthCalledWith(1, "/auth/google/start");
    expect(assign).toHaveBeenNthCalledWith(2, "/auth/magic-link/consume?token=a%20token");
  });

  it("keeps Google and magic flows as navigation helpers", () => {
    const assign = vi.fn();
    navigateToGoogleStart(assign);
    navigateToMagicConsume("a token", assign);
    expect(assign).toHaveBeenNthCalledWith(1, "/auth/google/start");
    expect(assign).toHaveBeenNthCalledWith(2, "/auth/magic-link/consume?token=a%20token");
  });
});
