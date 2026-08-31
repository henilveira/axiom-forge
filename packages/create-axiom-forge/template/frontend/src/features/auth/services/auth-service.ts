import {
  acceptedResponseSchema,
  authErrorResponseSchema,
  emailVerifyResponseSchema,
  sessionResponseSchema,
} from "@auth/schemas";
import { AUTH_API_PATHS, AUTH_COOKIE_NAMES, AUTH_HEADER_NAMES, AUTH_HTTP_STATUS } from "@auth/constants";
import type {
  AcceptedResponse,
  AuthPublicErrorCode,
  AuthRequestOptions,
  AuthResponseSchema,
  EmailVerifyResponse,
  MagicLinkRequest,
  PasswordLoginRequest,
  RegisterRequest,
  GoogleLinkRequest,
  SessionResponse,
} from "@auth/types";

export class AuthServiceError extends Error {
  readonly status: number;
  readonly code: AuthPublicErrorCode;

  constructor(status: number, code: AuthPublicErrorCode) {
    super(code);
    this.name = "AuthServiceError";
    this.status = status;
    this.code = code;
  }
}

const readCsrf = (): string | undefined => {
  if (typeof globalThis.document === "undefined") return undefined;
  const prefix = `${AUTH_COOKIE_NAMES.csrf}=`;
  const item = globalThis.document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
  return item?.slice(prefix.length);
};

const jsonBody = (body: unknown): string => JSON.stringify(body);

export class AuthService {
  private readonly fetcher: typeof fetch;
  private readonly csrfReader: () => string | undefined;

  constructor(fetcher: typeof fetch = globalThis.fetch, csrfReader: () => string | undefined = readCsrf) {
    this.fetcher = fetcher === globalThis.fetch ? fetcher.bind(globalThis) : fetcher;
    this.csrfReader = csrfReader;
  }

  register(body: RegisterRequest): Promise<AcceptedResponse> {
    return this.post(AUTH_API_PATHS.register, body, acceptedResponseSchema, { expectedStatus: AUTH_HTTP_STATUS.created, retryOnCsrfReject: false });
  }

  async verifyEmail(token: string | undefined): Promise<EmailVerifyResponse> {
    return await this.get(`${AUTH_API_PATHS.emailVerify}?token=${encodeURIComponent(token ?? "")}`, emailVerifyResponseSchema, { expectedStatus: AUTH_HTTP_STATUS.ok, retryOnCsrfReject: false });
  }

  passwordLogin(body: PasswordLoginRequest): Promise<SessionResponse> {
    return this.post(AUTH_API_PATHS.passwordLogin, body, sessionResponseSchema, { expectedStatus: AUTH_HTTP_STATUS.created, retryOnCsrfReject: false });
  }

  requestMagicLink(body: MagicLinkRequest): Promise<AcceptedResponse> {
    return this.post(AUTH_API_PATHS.magicLinkRequest, body, acceptedResponseSchema, { expectedStatus: AUTH_HTTP_STATUS.created, retryOnCsrfReject: false });
  }

  googleLink(body: GoogleLinkRequest): Promise<SessionResponse> {
    return this.protectedPost(AUTH_API_PATHS.googleLink, body, sessionResponseSchema, { expectedStatus: AUTH_HTTP_STATUS.created, retryOnCsrfReject: false });
  }

  refresh(): Promise<SessionResponse> {
    return this.protectedPost(AUTH_API_PATHS.sessionRefresh, undefined, sessionResponseSchema, { expectedStatus: AUTH_HTTP_STATUS.created, retryOnCsrfReject: true });
  }

  logout(): Promise<AcceptedResponse> {
    return this.protectedPost(AUTH_API_PATHS.logout, undefined, acceptedResponseSchema, { expectedStatus: AUTH_HTTP_STATUS.created, retryOnCsrfReject: false });
  }

  private async get<T>(path: string, schema: AuthResponseSchema<T>, options: AuthRequestOptions): Promise<T> {
    return await this.request(path, { method: "GET" }, schema, options);
  }

  private async post<T>(path: string, body: unknown, schema: AuthResponseSchema<T>, options: AuthRequestOptions): Promise<T> {
    return await this.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: jsonBody(body) }, schema, options);
  }

  private async protectedPost<T>(path: string, body: unknown, schema: AuthResponseSchema<T>, options: AuthRequestOptions): Promise<T> {
    const headers = new Headers({ "content-type": "application/json" });
    this.setCsrfHeader(headers);
    const init: RequestInit = { method: "POST", headers };
    if (body !== undefined) init.body = jsonBody(body);
    return await this.request(path, init, schema, options);
  }

  private setCsrfHeader(headers: Headers): void {
    const csrf = this.csrfReader();
    if (csrf === undefined || csrf.length === 0) {
      headers.delete(AUTH_HEADER_NAMES.csrfToken);
      return;
    }
    headers.set(AUTH_HEADER_NAMES.csrfToken, csrf);
  }

  private async request<T>(path: string, init: RequestInit, schema: AuthResponseSchema<T>, options: AuthRequestOptions): Promise<T> {
    const response = await this.fetcher(path, { ...init, credentials: "include", cache: "no-store" });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AuthServiceError(response.status, "AUTH_UNAVAILABLE");
    }
    if (!response.ok) {
      const parsed = authErrorResponseSchema.safeParse(payload);
      if (options.retryOnCsrfReject && response.status === AUTH_HTTP_STATUS.unauthorized && parsed.success && parsed.data.code === "AUTH_CSRF_REJECTED") {
        const retryHeaders = new Headers(init.headers);
        this.setCsrfHeader(retryHeaders);
        return await this.request(path, { ...init, headers: retryHeaders }, schema, { ...options, retryOnCsrfReject: false });
      }
      throw new AuthServiceError(response.status, parsed.success ? parsed.data.code : "AUTH_UNAVAILABLE");
    }
    if (response.status !== options.expectedStatus) {
      throw new AuthServiceError(response.status, "AUTH_UNAVAILABLE");
    }
    try {
      return schema.parse(payload);
    } catch {
      throw new AuthServiceError(response.status, "AUTH_UNAVAILABLE");
    }
  }
}

export const authService = new AuthService();
