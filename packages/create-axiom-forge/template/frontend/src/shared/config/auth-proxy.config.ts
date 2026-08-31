export const DEFAULT_AUTH_BACKEND_URL = "http://localhost:8080";
export const DEFAULT_AUTH_PUBLIC_ORIGIN = "http://localhost:3000";
const PRODUCTION_ENVIRONMENT = "production";

function isProduction(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  return environment["NODE_ENV"]?.trim() === PRODUCTION_ENVIRONMENT;
}

function invalidAuthOrigin(environmentVariable: string): never {
  throw new Error(`${environmentVariable} must be an absolute http(s) origin without credentials, path, query, or fragment`);
}

function isRootPath(pathname: string): boolean {
  return pathname === "" || pathname === "/";
}

function hasForbiddenDelimiters(configuredUrl: string): boolean {
  return configuredUrl.includes("@") || configuredUrl.includes("?") || configuredUrl.includes("#");
}

function parseAuthOrigin(configuredUrl: string, environmentVariable: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    return invalidAuthOrigin(environmentVariable);
  }

  if (hasForbiddenDelimiters(configuredUrl)) {
    return invalidAuthOrigin(environmentVariable);
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return invalidAuthOrigin(environmentVariable);
  }
  if (parsedUrl.username.length > 0 || parsedUrl.password.length > 0) {
    return invalidAuthOrigin(environmentVariable);
  }
  if (!isRootPath(parsedUrl.pathname)) {
    return invalidAuthOrigin(environmentVariable);
  }
  if (parsedUrl.search.length > 0 || parsedUrl.hash.length > 0) {
    return invalidAuthOrigin(environmentVariable);
  }

  return parsedUrl;
}

function parseAuthBackendUrl(configuredUrl: string): URL {
  return parseAuthOrigin(configuredUrl, "AUTH_BACKEND_URL");
}

export function resolveAuthBackendUrl(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const configuredUrl = environment["AUTH_BACKEND_URL"]?.trim();
  if (configuredUrl === undefined || configuredUrl.length === 0) {
    if (isProduction(environment)) {
      throw new Error("AUTH_BACKEND_URL is required in production");
    }
    return DEFAULT_AUTH_BACKEND_URL;
  }

  const parsedUrl = parseAuthBackendUrl(configuredUrl);
  if (isProduction(environment) && parsedUrl.protocol !== "https:") {
    throw new Error("AUTH_BACKEND_URL must use https in production");
  }

  return parsedUrl.origin;
}

export function resolveAuthPublicOrigin(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const configuredOrigin = environment["AUTH_PUBLIC_ORIGIN"]?.trim();
  if (configuredOrigin === undefined || configuredOrigin.length === 0) {
    if (isProduction(environment)) {
      throw new Error("AUTH_PUBLIC_ORIGIN is required in production");
    }
    return DEFAULT_AUTH_PUBLIC_ORIGIN;
  }

  const parsedOrigin = parseAuthOrigin(configuredOrigin, "AUTH_PUBLIC_ORIGIN");
  if (isProduction(environment) && parsedOrigin.protocol !== "https:") {
    throw new Error("AUTH_PUBLIC_ORIGIN must use https in production");
  }

  return parsedOrigin.origin;
}
