import { describe, expect, it, vi } from "vitest";

import { AUTH_PROXY_MAX_BODY_BYTES } from "@shared";

import { GET, POST } from "./route";

const CREATED = 201;
const LOCAL_AUTH_BACKEND_URL = "http://localhost:8080";
const LOCAL_AUTH_PUBLIC_ORIGIN = "http://localhost:3000";

function restoreFetch(originalFetch: typeof fetch): void {
  vi.stubGlobal("fetch", originalFetch);
}

function stubLocalAuthEnvironment(): void {
  vi.stubEnv("AUTH_BACKEND_URL", LOCAL_AUTH_BACKEND_URL);
  vi.stubEnv("AUTH_PUBLIC_ORIGIN", LOCAL_AUTH_PUBLIC_ORIGIN);
}

function restoreAuthEnvironment(): void {
  vi.unstubAllEnvs();
}

function readTarget(target: Parameters<typeof fetch>[0] | undefined): string {
  if (typeof target === "string") {
    return target;
  }
  if (target instanceof URL) {
    return target.href;
  }
  if (target instanceof Request) {
    return target.url;
  }
  throw new Error("upstream target was not captured");
}

describe("server-side authentication proxy forwarding", () => {
  it("derives the configured public Origin when the browser omits it and preserves CSRF/cookies", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamHeaders = new Headers({ "content-type": "application/json", connection: "close" });
    upstreamHeaders.append("set-cookie", "app_csrf=rotated; Path=/");
    upstreamHeaders.append("set-cookie", "app_refresh=rotated; Path=/");
    const upstreamFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ outcome: "SUCCESS" }), {
          status: CREATED,
          headers: upstreamHeaders,
        }),
      ),
    );
    vi.stubGlobal("fetch", upstreamFetch);

    try {
      stubLocalAuthEnvironment();
      const response = await POST(
        new Request("http://localhost:3000/auth/session/refresh", {
          method: "POST",
          headers: {
            cookie: "app_refresh=opaque; app_csrf=csrf-value; analytics=must-not-forward",
            host: "localhost:3000",
            "x-csrf-token": "csrf-value",
            "content-type": "application/json",
            connection: "keep-alive",
          },
          body: JSON.stringify({ operation: "probe" }),
        }),
      );

      expect(response.status).toBe(CREATED);
      expect(response.headers.getSetCookie()).toEqual(["app_csrf=rotated; Path=/", "app_refresh=rotated; Path=/"]);
      const [target, init] = upstreamFetch.mock.calls[0] ?? [];
      expect(readTarget(target)).toBe("http://localhost:8080/auth/session/refresh");
      const headers = new Headers(init?.headers);
      expect(headers.get("origin")).toBe("http://localhost:3000");
      expect(headers.get("x-csrf-token")).toBe("csrf-value");
      expect(headers.get("cookie")).toBe("app_refresh=opaque; app_csrf=csrf-value");
      expect(headers.get("connection")).toBeNull();
      expect(init?.method).toBe("POST");
      expect(init?.cache).toBe("no-store");
      expect(init?.redirect).toBe("manual");
      await expect(new Response(init?.body).text()).resolves.toBe(JSON.stringify({ operation: "probe" }));
      expect(new Headers(response.headers).get("connection")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    } finally {
      restoreFetch(originalFetch);
      restoreAuthEnvironment();
    }
  });
});

describe("server-side authentication proxy rejection and limits", () => {

  it("rejects an untrusted request origin before forwarding a protected call", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);

    try {
      const response = await POST(
        new Request("http://localhost:3000/auth/session/refresh", {
          method: "POST",
          headers: {
            origin: "https://evil.example",
            cookie: "app_csrf=csrf-value",
            "x-csrf-token": "csrf-value",
          },
        }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ code: "AUTH_CSRF_REJECTED" });
      expect(upstreamFetch).not.toHaveBeenCalled();
    } finally {
      restoreFetch(originalFetch);
    }
  });

  it("does not derive a trusted Origin from an unconfigured request host", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);

    try {
      const response = await POST(
        new Request("https://evil.example/auth/session/refresh", {
          method: "POST",
          headers: {
            cookie: "app_csrf=csrf-value",
            "x-csrf-token": "csrf-value",
          },
        }),
      );

      expect(response.status).toBe(401);
      expect(upstreamFetch).not.toHaveBeenCalled();
    } finally {
      restoreFetch(originalFetch);
    }
  });

  it("rejects a mismatched Host even when the request URL looks trusted", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);

    try {
      const response = await POST(
        new Request("http://localhost:3000/auth/session/refresh", {
          method: "POST",
          headers: {
            host: "evil.example",
            cookie: "app_csrf=csrf-value",
            "x-csrf-token": "csrf-value",
          },
        }),
      );

      expect(response.status).toBe(401);
      expect(upstreamFetch).not.toHaveBeenCalled();
    } finally {
      restoreFetch(originalFetch);
    }
  });
});

describe("server-side authentication proxy body limits and verification", () => {

  it("rejects a declared body above the limit before forwarding", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);

    try {
      const response = await POST(
        new Request("http://localhost:3000/auth/register", {
          method: "POST",
          headers: { "content-length": String(AUTH_PROXY_MAX_BODY_BYTES + 1) },
          body: "{}",
        }),
      );

      expect(response.status).toBe(413);
      await expect(response.json()).resolves.toEqual({ code: "AUTH_UNAVAILABLE" });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(upstreamFetch).not.toHaveBeenCalled();
    } finally {
      restoreFetch(originalFetch);
    }
  });

  it("counts streamed chunks when Content-Length is absent and rejects overflow", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);
    const oversizedBody = new Blob([new Uint8Array(AUTH_PROXY_MAX_BODY_BYTES), new Uint8Array(1)]);

    try {
      const request = new Request("http://localhost:3000/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: oversizedBody,
      });

      expect(request.headers.get("content-length")).toBeNull();
      const response = await POST(request);

      expect(response.status).toBe(413);
      await expect(response.json()).resolves.toEqual({ code: "AUTH_UNAVAILABLE" });
      expect(upstreamFetch).not.toHaveBeenCalled();
    } finally {
      restoreFetch(originalFetch);
    }
  });

  it("forwards verification GETs without requiring a mutation Origin", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ outcome: "REJECTED" }), { status: 200 })),
    );
    vi.stubGlobal("fetch", upstreamFetch);

    try {
      stubLocalAuthEnvironment();
      const response = await GET(new Request("http://localhost:3000/auth/email/verify?token=opaque-token"));

      expect(response.status).toBe(200);
      const [target, init] = upstreamFetch.mock.calls[0] ?? [];
      expect(readTarget(target)).toBe("http://localhost:8080/auth/email/verify?token=opaque-token");
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("origin")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    } finally {
      restoreFetch(originalFetch);
      restoreAuthEnvironment();
    }
  });
});

describe("server-side authentication proxy failures", () => {
  it("maps an upstream network failure to a safe unavailable response", async () => {
    const originalFetch = globalThis.fetch;
    const upstreamFetch = vi.fn<typeof fetch>(() => Promise.reject(new Error("backend unavailable at http://localhost:8080")));
    vi.stubGlobal("fetch", upstreamFetch);

    try {
      const response = await POST(
        new Request("http://localhost:3000/auth/login/password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "ana@example.com", password: "secret" }),
        }),
      );

      expect(response.status).toBe(503);
      const body = await response.text();
      expect(body).toBe('{"code":"AUTH_UNAVAILABLE"}');
      expect(body).not.toContain("localhost:8080");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    } finally {
      restoreFetch(originalFetch);
    }
  });

  it("does not proxy an unapproved auth path or expose the backend URL", async () => {
    const response = await GET(new Request("http://localhost:3000/auth/internal/debug"));

    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toBe('{"code":"AUTH_UNAVAILABLE"}');
    expect(body).not.toContain("localhost:8080");
  });
});
