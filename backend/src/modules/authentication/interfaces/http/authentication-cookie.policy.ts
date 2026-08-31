import type { AuthenticationConfig } from '../../application/ports/authentication-config.port';
import type { HttpResponseLike } from './http.types';
import type { SessionResult } from '../../application/dto/authentication-result.dto';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  ACCESS_COOKIE_NAME,
  CHALLENGE_COOKIE_MAX_AGE_MS,
  CSRF_COOKIE_NAME,
  GOOGLE_LINK_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
} from './authentication-cookie.constants';

export class AuthenticationCookiePolicy {
  public constructor(private readonly config: AuthenticationConfig) {}

  public setSession(
    response: HttpResponseLike,
    result: SessionResult,
    csrfToken: string,
  ): void {
    const options = this.options();
    response.cookie(ACCESS_COOKIE_NAME, result.accessToken, {
      ...options,
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    });
    response.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      ...options,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
    response.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...options,
      httpOnly: false,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
    this.noStore(response);
  }

  public setOAuthState(
    response: HttpResponseLike,
    state: string,
    csrfToken: string,
  ): void {
    response.cookie(OAUTH_STATE_COOKIE_NAME, state, {
      ...this.options(),
      maxAge: CHALLENGE_COOKIE_MAX_AGE_MS,
    });
    response.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...this.options(),
      httpOnly: false,
      maxAge: CHALLENGE_COOKIE_MAX_AGE_MS,
    });
    this.noStore(response);
  }

  public setGoogleLink(response: HttpResponseLike, attemptId: string): void {
    response.cookie(GOOGLE_LINK_COOKIE_NAME, attemptId, {
      ...this.options(),
      maxAge: CHALLENGE_COOKIE_MAX_AGE_MS,
    });
    this.noStore(response);
  }

  public clearOAuthState(response: HttpResponseLike): void {
    response.clearCookie(OAUTH_STATE_COOKIE_NAME, this.options());
    this.noStore(response);
  }

  public clearGoogleLink(response: HttpResponseLike): void {
    response.clearCookie(GOOGLE_LINK_COOKIE_NAME, this.options());
    this.noStore(response);
  }

  public clear(response: HttpResponseLike): void {
    const options = this.options();
    response.clearCookie(ACCESS_COOKIE_NAME, options);
    response.clearCookie(REFRESH_COOKIE_NAME, options);
    response.clearCookie(CSRF_COOKIE_NAME, { ...options, httpOnly: false });
    response.clearCookie(OAUTH_STATE_COOKIE_NAME, options);
    response.clearCookie(GOOGLE_LINK_COOKIE_NAME, options);
    this.noStore(response);
  }

  public refreshToken(request: {
    readonly cookies?: Readonly<Record<string, string | undefined>>;
  }): string | undefined {
    return request.cookies?.[REFRESH_COOKIE_NAME];
  }

  public oauthState(request: {
    readonly cookies?: Readonly<Record<string, string | undefined>>;
  }): string | undefined {
    return request.cookies?.[OAUTH_STATE_COOKIE_NAME];
  }

  public googleLinkAttempt(request: {
    readonly cookies?: Readonly<Record<string, string | undefined>>;
  }): string | undefined {
    return request.cookies?.[GOOGLE_LINK_COOKIE_NAME];
  }

  public csrfToken(request: {
    readonly cookies?: Readonly<Record<string, string | undefined>>;
  }): string | undefined {
    return request.cookies?.[CSRF_COOKIE_NAME];
  }

  private options(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    domain: string;
  } {
    return {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: 'lax',
      path: '/',
      domain: this.config.cookieDomain,
    };
  }

  public noStore(response: HttpResponseLike): void {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
  }
}
