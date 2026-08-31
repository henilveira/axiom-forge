import { describe, expect, test } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_AUTH_BACKEND_URL, DEFAULT_AUTH_PUBLIC_ORIGIN, resolveAuthBackendUrl, resolveAuthPublicOrigin } from "./config";

const nextConfigSource = readFileSync(join(import.meta.dirname, "../../next.config.ts"), "utf8");

function createEnvironment(
  backendUrl?: string,
  nodeEnvironment?: string,
  publicOrigin?: string,
): Readonly<Record<string, string | undefined>> {
  return Object.fromEntries([
    ["AUTH_BACKEND_URL", backendUrl],
    ["NODE_ENV", nodeEnvironment],
    ["AUTH_PUBLIC_ORIGIN", publicOrigin],
  ]);
}

describe("Next authentication proxy", () => {
  test("defaults to the server-only local backend and public origin", () => {
    expect(resolveAuthBackendUrl({})).toBe(DEFAULT_AUTH_BACKEND_URL);
    expect(resolveAuthBackendUrl(createEnvironment(undefined, "development"))).toBe(DEFAULT_AUTH_BACKEND_URL);
    expect(resolveAuthBackendUrl(createEnvironment(undefined, "test"))).toBe(DEFAULT_AUTH_BACKEND_URL);
    expect(resolveAuthBackendUrl(createEnvironment(" http://auth.internal:8080/ "))).toBe("http://auth.internal:8080");
    expect(resolveAuthBackendUrl(createEnvironment("https://auth.internal:8443/", "production"))).toBe("https://auth.internal:8443");

    expect(resolveAuthPublicOrigin({})).toBe(DEFAULT_AUTH_PUBLIC_ORIGIN);
    expect(resolveAuthPublicOrigin(createEnvironment(undefined, "development", "http://localhost:3301/"))).toBe("http://localhost:3301");
    expect(resolveAuthPublicOrigin(createEnvironment(undefined, "production", "https://app.example.test/"))).toBe("https://app.example.test");
  });

  test.each([
    "ftp://auth.internal",
    "https://user:pass@auth.internal",
    "https://@auth.internal",
    "https://auth.internal/api",
    "https://auth.internal?tenant=example",
    "https://auth.internal?",
    "https://auth.internal#fragment",
    "https://auth.internal#",
    "https://auth.internal///",
  ])("rejects unsafe backend origin %s", (backendUrl) => {
    expect(() => resolveAuthBackendUrl(createEnvironment(backendUrl))).toThrow();
  });

  test.each([undefined, ""])("fails closed when production has no backend URL: %s", (backendUrl) => {
    expect(() => resolveAuthBackendUrl(createEnvironment(backendUrl, "production"))).toThrow("required in production");
  });

  test.each([undefined, ""])("fails closed when production has no public origin: %s", (publicOrigin) => {
    expect(() => resolveAuthPublicOrigin(createEnvironment(undefined, "production", publicOrigin))).toThrow("AUTH_PUBLIC_ORIGIN is required in production");
  });

  test("rejects http in production", () => {
    expect(() => resolveAuthBackendUrl(createEnvironment("http://auth.internal/", "production"))).toThrow("must use https");
    expect(() => resolveAuthPublicOrigin(createEnvironment(undefined, "production", "http://app.internal/"))).toThrow("AUTH_PUBLIC_ORIGIN must use https");
  });

  test("uses the server-side proxy and does not expose the backend URL through public Next environment config", () => {
    expect(nextConfigSource).toContain("resolveAuthBackendUrl");
    expect(nextConfigSource).toContain("resolveAuthPublicOrigin");
    expect(nextConfigSource).not.toContain("rewrites");
    expect(nextConfigSource).not.toContain("NEXT_PUBLIC_AUTH_BACKEND_URL");
  });

  test("marks the verification page as private and uncached", () => {
    expect(nextConfigSource).toMatch(
      /source: "\/email\/verify",\s*headers: \[[\s\S]*\{ key: "Cache-Control", value: "no-store" \},\s*\{ key: "Referrer-Policy", value: "no-referrer" \},\s*\]/,
    );
  });
});
