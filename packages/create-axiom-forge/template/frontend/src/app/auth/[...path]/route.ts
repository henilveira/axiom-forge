import { AUTH_API_PATHS } from "@auth";
import {
  AUTH_PROXY_MAX_BODY_BYTES,
  AUTH_PROXY_PAYLOAD_TOO_LARGE_STATUS,
  resolveAuthBackendUrl,
  resolveAuthPublicOrigin,
} from "@shared";

export const runtime = "nodejs";

const AUTH_PROXY_PATHS: ReadonlySet<string> = new Set(Object.values(AUTH_API_PATHS));
const PROTECTED_AUTH_PATHS: ReadonlySet<string> = new Set([
  AUTH_API_PATHS.googleLink,
  AUTH_API_PATHS.sessionRefresh,
  AUTH_API_PATHS.logout,
]);
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "cookie",
  "user-agent",
  "x-correlation-id",
  "x-csrf-token",
] as const;
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const BODYLESS_REQUEST_METHODS = new Set(["GET", "HEAD"]);

class AuthProxyBodyTooLargeError extends Error {}

function jsonError(code: "AUTH_CSRF_REJECTED" | "AUTH_UNAVAILABLE", status: number): Response {
  return Response.json(
    { code },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      },
    },
  );
}

function firstHeaderValue(value: string): string {
  return value.split(",")[0]?.trim() ?? "";
}

function matchesConfiguredHost(value: string, configuredOrigin: URL): boolean {
  const candidateHost = firstHeaderValue(value);
  if (candidateHost.length === 0) {
    return false;
  }

  try {
    const candidate = new URL(`${configuredOrigin.protocol}//${candidateHost}`);
    return candidate.host === configuredOrigin.host;
  } catch {
    return false;
  }
}

function resolveTrustedOrigin(request: Request): string | undefined {
  const configuredOrigin = resolveAuthPublicOrigin(process.env);
  const configuredUrl = new URL(configuredOrigin);
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== configuredOrigin) {
    return undefined;
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader != null && !matchesConfiguredHost(hostHeader, configuredUrl)) {
    return undefined;
  }

  const forwardedHostHeader = request.headers.get("x-forwarded-host");
  if (forwardedHostHeader != null && !matchesConfiguredHost(forwardedHostHeader, configuredUrl)) {
    return undefined;
  }

  const forwardedProtocolHeader = request.headers.get("x-forwarded-proto");
  if (forwardedProtocolHeader != null && firstHeaderValue(forwardedProtocolHeader) !== configuredUrl.protocol.slice(0, -1)) {
    return undefined;
  }

  const incomingOrigin = request.headers.get("origin");
  if (incomingOrigin != null && incomingOrigin !== configuredOrigin) {
    return undefined;
  }

  return configuredOrigin;
}

function filterAuthCookies(cookieHeader: string | null): string | undefined {
  if (cookieHeader == null) {
    return undefined;
  }

  const authCookies = cookieHeader.split(";").map((cookie) => cookie.trim()).filter((cookie) => {
    const separatorIndex = cookie.indexOf("=");
    return separatorIndex > 0 && cookie.slice(0, separatorIndex).trim().startsWith("app_");
  });
  return authCookies.length > 0 ? authCookies.join("; ") : undefined;
}

function createForwardedHeaders(request: Request, trustedOrigin: string | undefined): Headers {
  const headers = new Headers();
  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    copyForwardedHeader(headers, request, headerName);
  }
  if (trustedOrigin !== undefined) {
    headers.set("origin", trustedOrigin);
  }
  return headers;
}

function copyForwardedHeader(headers: Headers, request: Request, headerName: (typeof FORWARDED_REQUEST_HEADERS)[number]): void {
  const value = request.headers.get(headerName);
  if (value == null) {
    return;
  }
  if (headerName !== "cookie") {
    headers.set(headerName, value);
    return;
  }

  const filteredCookie = filterAuthCookies(value);
  if (filteredCookie !== undefined) {
    headers.set(headerName, filteredCookie);
  }
}

function createResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const [name, value] of upstream.headers.entries()) {
    const normalizedName = name.toLowerCase();
    if (normalizedName !== "set-cookie" && !HOP_BY_HOP_RESPONSE_HEADERS.has(normalizedName)) {
      headers.set(name, value);
    }
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }
  headers.set("cache-control", "no-store");
  headers.set("referrer-policy", "no-referrer");
  return headers;
}

function parseContentLength(request: Request): number | undefined {
  const value = request.headers.get("content-length");
  if (value == null) {
    return undefined;
  }

  const contentLength = Number(value);
  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    throw new AuthProxyBodyTooLargeError("invalid content length");
  }
  return contentLength;
}

async function readBodyWithinLimit(request: Request): Promise<ArrayBuffer | undefined> {
  if (BODYLESS_REQUEST_METHODS.has(request.method)) {
    return undefined;
  }

  const contentLength = parseContentLength(request);
  if (contentLength !== undefined && contentLength > AUTH_PROXY_MAX_BODY_BYTES) {
    throw new AuthProxyBodyTooLargeError("request body exceeds proxy limit");
  }
  if (request.body == null) {
    return undefined;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let result = await reader.read();
  while (!result.done) {
    totalBytes += result.value.byteLength;
    if (totalBytes > AUTH_PROXY_MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new AuthProxyBodyTooLargeError("request body exceeds proxy limit");
    }
    chunks.push(result.value);
    result = await reader.read();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

async function proxyAuthRequest(request: Request): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    if (!AUTH_PROXY_PATHS.has(requestUrl.pathname)) {
      return jsonError("AUTH_UNAVAILABLE", 404);
    }

    const requiresOrigin = PROTECTED_AUTH_PATHS.has(requestUrl.pathname) && request.method !== "GET";
    const trustedOrigin = requiresOrigin ? resolveTrustedOrigin(request) : undefined;
    if (requiresOrigin && trustedOrigin === undefined) {
      return jsonError("AUTH_CSRF_REJECTED", 401);
    }

    const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, resolveAuthBackendUrl(process.env));
    const body = await readBodyWithinLimit(request);
    const upstream = await fetch(target, {
      method: request.method,
      headers: createForwardedHeaders(request, trustedOrigin),
      ...(body === undefined || body.byteLength === 0 ? {} : { body }),
      cache: "no-store",
      redirect: "manual",
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: createResponseHeaders(upstream),
    });
  } catch (error: unknown) {
    if (error instanceof AuthProxyBodyTooLargeError) {
      return jsonError("AUTH_UNAVAILABLE", AUTH_PROXY_PAYLOAD_TOO_LARGE_STATUS);
    }
    return jsonError("AUTH_UNAVAILABLE", 503);
  }
}

export async function GET(request: Request): Promise<Response> {
  return await proxyAuthRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return await proxyAuthRequest(request);
}
