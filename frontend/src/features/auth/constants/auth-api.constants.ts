export const AUTH_OUTCOMES = {
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  success: "SUCCESS",
  redirect: "REDIRECT",
  linkRequired: "LINK_REQUIRED",
} as const;

export const AUTH_PUBLIC_ERROR_CODES = {
  failed: "AUTH_FAILED",
  linkingRequired: "AUTH_LINKING_REQUIRED",
  csrfRejected: "AUTH_CSRF_REJECTED",
  googleUnavailable: "AUTH_GOOGLE_UNAVAILABLE",
  rateLimited: "AUTH_RATE_LIMITED",
  unavailable: "AUTH_UNAVAILABLE",
} as const;

export const AUTH_API_PATHS = {
  register: "/auth/register",
  emailVerify: "/auth/email/verify",
  passwordLogin: "/auth/login/password",
  magicLinkRequest: "/auth/magic-link/request",
  magicLinkConsume: "/auth/magic-link/consume",
  googleStart: "/auth/google/start",
  googleCallback: "/auth/google/callback",
  googleLink: "/auth/google/link",
  sessionRefresh: "/auth/session/refresh",
  logout: "/auth/logout",
} as const;

export const AUTH_DEFAULT_REDIRECT_PATH = "/";
export const AUTH_LOGIN_PATH = "/login";

export const AUTH_HEADER_NAMES = {
  csrfToken: "x-csrf-token",
  correlationId: "x-correlation-id",
} as const;

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_UNAUTHORIZED = 401;

export const AUTH_HTTP_STATUS = {
  ok: HTTP_STATUS_OK,
  created: HTTP_STATUS_CREATED,
  unauthorized: HTTP_STATUS_UNAUTHORIZED,
} as const;

export const AUTH_COOKIE_NAMES = {
  csrf: "app_csrf",
  session: "app_session",
  refresh: "app_refresh",
  oauthState: "app_oauth_state",
  googleLink: "app_google_link",
} as const;
