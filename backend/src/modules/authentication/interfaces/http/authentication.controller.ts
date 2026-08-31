import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticationError } from '../../domain/errors/authentication.error';
import type { AuthenticationContext } from '../../domain/types/authentication.types';
import { AUTHENTICATION_RUNTIME } from '../../application/ports/authentication-runtime.port';
import type { AuthenticationRuntime } from '../../application/ports/authentication-runtime.port';
import type { HttpRequestLike, HttpResponseLike } from './http.types';
import {
  parseGoogleLinkBody,
  parseMagicLinkBody,
  parsePasswordLoginBody,
  parseRegisterBody,
} from './authentication.dto';
import { AuthenticationCookiePolicy } from './authentication-cookie.policy';

import {
  AUTHENTICATION_TOKEN_BYTES,
  HTTP_FOUND,
  HTTP_SEE_OTHER,
  MAX_CORRELATION_ID_LENGTH,
} from './http.constants';
import {
  GOOGLE_CALLBACK_SWAGGER,
  GOOGLE_LINK_SWAGGER,
  GOOGLE_START_SWAGGER,
  LOGIN_SWAGGER,
  LOGOUT_SWAGGER,
  MAGIC_LINK_CONSUME_SWAGGER,
  MAGIC_LINK_REQUEST_SWAGGER,
  REGISTER_SWAGGER,
  SESSION_REFRESH_SWAGGER,
  VERIFY_EMAIL_SWAGGER,
} from './authentication.swagger.constants';

function encodeToken(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

@ApiTags('auth')
@Controller('auth')
export class AuthenticationController {
  private readonly cookies: AuthenticationCookiePolicy;

  public constructor(
    @Inject(AUTHENTICATION_RUNTIME)
    private readonly runtime: AuthenticationRuntime,
  ) {
    this.cookies = new AuthenticationCookiePolicy(runtime.config);
  }

  @ApiOperation(REGISTER_SWAGGER.operation)
  @ApiBody(REGISTER_SWAGGER.body)
  @ApiResponse(REGISTER_SWAGGER.accepted)
  @ApiResponse(REGISTER_SWAGGER.invalid)
  @Post('register')
  public async registerPassword(
    @Body() body: unknown,
    @Req() request: HttpRequestLike,
  ): Promise<{ outcome: 'ACCEPTED' }> {
    const input = parseRegisterBody(body);
    return await this.runtime.register.execute({
      ...input,
      context: this.context(request),
    });
  }

  @ApiOperation(VERIFY_EMAIL_SWAGGER.operation)
  @ApiQuery(VERIFY_EMAIL_SWAGGER.query)
  @ApiResponse(VERIFY_EMAIL_SWAGGER.accepted)
  @ApiResponse(VERIFY_EMAIL_SWAGGER.rejected)
  @Get('email/verify')
  public async verify(
    @Query('token') token: string | undefined,
    @Res({ passthrough: true }) response: HttpResponseLike,
    @Req() request: HttpRequestLike,
  ): Promise<{ outcome: 'ACCEPTED' | 'REJECTED' }> {
    this.cookies.noStore(response);
    return await this.runtime.verifyEmail.execute({
      token: token ?? '',
      context: this.context(request),
    });
  }

  @ApiOperation(LOGIN_SWAGGER.operation)
  @ApiBody(LOGIN_SWAGGER.body)
  @ApiResponse(LOGIN_SWAGGER.success)
  @ApiResponse(LOGIN_SWAGGER.failed)
  @ApiResponse(LOGIN_SWAGGER.rateLimited)
  @Post('login/password')
  public async loginPassword(
    @Body() body: unknown,
    @Req() request: HttpRequestLike,
    @Res({ passthrough: true }) response: HttpResponseLike,
  ): Promise<{ outcome: 'SUCCESS' }> {
    const input = parsePasswordLoginBody(body);
    const result = await this.runtime.login.execute({
      ...input,
      fingerprint: this.requestFingerprint(request),
      context: this.context(request),
    });
    this.cookies.setSession(
      response,
      result,
      encodeToken(this.runtime.random.bytes(AUTHENTICATION_TOKEN_BYTES)),
    );
    return { outcome: 'SUCCESS' };
  }

  @ApiOperation(MAGIC_LINK_REQUEST_SWAGGER.operation)
  @ApiBody(MAGIC_LINK_REQUEST_SWAGGER.body)
  @ApiResponse(MAGIC_LINK_REQUEST_SWAGGER.accepted)
  @ApiResponse(MAGIC_LINK_REQUEST_SWAGGER.rateLimited)
  @Post('magic-link/request')
  public async magicLink(
    @Body() body: unknown,
    @Req() request: HttpRequestLike,
  ): Promise<{ outcome: 'ACCEPTED' }> {
    const input = parseMagicLinkBody(body);
    return await this.runtime.requestMagicLink.execute({
      ...input,
      fingerprint: this.requestFingerprint(request),
      context: this.context(request),
    });
  }

  @ApiOperation(MAGIC_LINK_CONSUME_SWAGGER.operation)
  @ApiQuery(MAGIC_LINK_CONSUME_SWAGGER.query)
  @ApiResponse(MAGIC_LINK_CONSUME_SWAGGER.redirect)
  @ApiResponse(MAGIC_LINK_CONSUME_SWAGGER.failed)
  @Get('magic-link/consume')
  public async consumeMagic(
    @Query('token') token: string | undefined,
    @Res({ passthrough: true }) response: HttpResponseLike,
    @Req() request: HttpRequestLike,
  ): Promise<{ outcome: 'SUCCESS' }> {
    this.cookies.noStore(response);
    const result = await this.runtime.consumeMagicLink.execute({
      token: token ?? '',
      context: this.context(request),
    });
    this.cookies.setSession(
      response,
      result,
      encodeToken(this.runtime.random.bytes(AUTHENTICATION_TOKEN_BYTES)),
    );
    response.redirect(HTTP_SEE_OTHER, this.runtime.config.redirectPath);
    return { outcome: 'SUCCESS' };
  }

  @ApiOperation(GOOGLE_START_SWAGGER.operation)
  @ApiResponse(GOOGLE_START_SWAGGER.redirect)
  @ApiResponse(GOOGLE_START_SWAGGER.unavailable)
  @Get('google/start')
  public async googleStart(
    @Res({ passthrough: true }) response: HttpResponseLike,
    @Req() request: HttpRequestLike,
  ): Promise<{ outcome: 'REDIRECT'; authorizationUrl: string }> {
    const result = await this.runtime.startGoogle.execute(
      this.context(request),
    );
    this.cookies.setOAuthState(
      response,
      result.state,
      encodeToken(this.runtime.random.bytes(AUTHENTICATION_TOKEN_BYTES)),
    );
    response.status(HTTP_FOUND);
    response.setHeader('Location', result.authorizationUrl);
    return { outcome: 'REDIRECT', authorizationUrl: result.authorizationUrl };
  }

  @ApiOperation(GOOGLE_CALLBACK_SWAGGER.operation)
  @ApiQuery(GOOGLE_CALLBACK_SWAGGER.codeQuery)
  @ApiQuery(GOOGLE_CALLBACK_SWAGGER.stateQuery)
  @ApiResponse(GOOGLE_CALLBACK_SWAGGER.redirect)
  @ApiResponse(GOOGLE_CALLBACK_SWAGGER.failed)
  @Get('google/callback')
  public async googleCallbackRoute(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: HttpRequestLike,
    @Res({ passthrough: true }) response: HttpResponseLike,
  ): Promise<{ outcome: 'SUCCESS' | 'LINK_REQUIRED'; linkAttemptId?: string }> {
    let oauthStateCleared = false;
    const clearOAuthState = (): void => {
      if (oauthStateCleared) {
        return;
      }
      oauthStateCleared = true;
      this.cookies.clearOAuthState(response);
    };

    try {
      if (state === undefined || state !== this.cookies.oauthState(request)) {
        throw new TypeError('oauth-state-invalid');
      }
      const result = await this.runtime.googleCallback.execute({
        code: code ?? '',
        state,
        context: this.context(request),
      });
      if (result.outcome === 'LINK_REQUIRED') {
        this.cookies.setGoogleLink(response, result.linkAttemptId);
        clearOAuthState();
        response.status(HTTP_SEE_OTHER);
        response.setHeader('Location', this.runtime.config.redirectPath);
        return {
          outcome: 'LINK_REQUIRED',
          linkAttemptId: result.linkAttemptId,
        };
      }
      this.cookies.setSession(
        response,
        result,
        encodeToken(this.runtime.random.bytes(AUTHENTICATION_TOKEN_BYTES)),
      );
      this.cookies.clearGoogleLink(response);
      clearOAuthState();
      response.status(HTTP_SEE_OTHER);
      response.setHeader('Location', this.runtime.config.redirectPath);
      return { outcome: 'SUCCESS' };
    } catch (error: unknown) {
      clearOAuthState();
      throw error;
    }
  }

  @ApiOperation(GOOGLE_LINK_SWAGGER.operation)
  @ApiCookieAuth('app_google_link')
  @ApiHeader(GOOGLE_LINK_SWAGGER.csrfHeader)
  @ApiBody(GOOGLE_LINK_SWAGGER.body)
  @ApiResponse(GOOGLE_LINK_SWAGGER.success)
  @ApiResponse(GOOGLE_LINK_SWAGGER.failed)
  @Post('google/link')
  public async linkGoogle(
    @Body() body: unknown,
    @Req() request: HttpRequestLike,
    @Res({ passthrough: true }) response: HttpResponseLike,
  ): Promise<{ outcome: 'SUCCESS' }> {
    this.assertCsrf(request);
    const input = parseGoogleLinkBody(body);
    const linkAttemptId = this.cookies.googleLinkAttempt(request);
    if (linkAttemptId === undefined) {
      throw new TypeError('google-link-missing');
    }
    try {
      const result = await this.runtime.confirmGoogleLink.execute({
        ...input,
        attemptId: linkAttemptId,
        context: this.context(request),
      });
      this.cookies.setSession(
        response,
        result,
        encodeToken(this.runtime.random.bytes(AUTHENTICATION_TOKEN_BYTES)),
      );
      return { outcome: 'SUCCESS' };
    } finally {
      this.cookies.clearGoogleLink(response);
    }
  }

  @ApiOperation(SESSION_REFRESH_SWAGGER.operation)
  @ApiCookieAuth('app_refresh')
  @ApiHeader(SESSION_REFRESH_SWAGGER.csrfHeader)
  @ApiResponse(SESSION_REFRESH_SWAGGER.success)
  @ApiResponse(SESSION_REFRESH_SWAGGER.failed)
  @Post('session/refresh')
  public async refresh(
    @Req() request: HttpRequestLike,
    @Res({ passthrough: true }) response: HttpResponseLike,
  ): Promise<{ outcome: 'SUCCESS' }> {
    this.assertCsrf(request);
    const refreshToken = this.cookies.refreshToken(request);
    if (refreshToken === undefined) {
      throw new TypeError('refresh-missing');
    }
    const result = await this.runtime.refreshSession.execute({
      refreshToken,
      context: this.context(request),
    });
    this.cookies.setSession(
      response,
      result,
      encodeToken(this.runtime.random.bytes(AUTHENTICATION_TOKEN_BYTES)),
    );
    return { outcome: 'SUCCESS' };
  }

  @ApiOperation(LOGOUT_SWAGGER.operation)
  @ApiCookieAuth('app_refresh')
  @ApiHeader(LOGOUT_SWAGGER.csrfHeader)
  @ApiResponse(LOGOUT_SWAGGER.accepted)
  @ApiResponse(LOGOUT_SWAGGER.failed)
  @Post('logout')
  public async logoutRoute(
    @Req() request: HttpRequestLike,
    @Res({ passthrough: true }) response: HttpResponseLike,
  ): Promise<{ outcome: 'ACCEPTED' }> {
    this.assertCsrf(request);
    const refreshToken = this.cookies.refreshToken(request) ?? '';
    const result = await this.runtime.logout.execute({
      refreshToken,
      context: this.context(request),
    });
    this.cookies.clear(response);
    return result;
  }

  private context(request: HttpRequestLike): AuthenticationContext {
    const header = request.headers['x-correlation-id'];
    const correlationHeader = Array.isArray(header) ? header[0] : header;
    return {
      correlationId:
        correlationHeader !== undefined &&
        correlationHeader.length > 0 &&
        correlationHeader.length <= MAX_CORRELATION_ID_LENGTH
          ? correlationHeader
          : this.runtime.random.id(),
      browserBinding: this.requestFingerprint(request),
    };
  }

  private requestFingerprint(request: HttpRequestLike): string {
    const value = request.headers['user-agent'];
    const userAgent = Array.isArray(value)
      ? (value[0] ?? 'unknown')
      : (value ?? 'unknown');
    return this.runtime.fingerprint.request(
      `${request.ip ?? 'unknown'}:${userAgent}`,
    );
  }

  private assertCsrf(request: HttpRequestLike): void {
    const originHeader = request.headers['origin'];
    const tokenHeader = request.headers['x-csrf-token'];
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    const csrfToken = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    const cookieToken = this.cookies.csrfToken(request);
    if (
      !this.runtime.csrf.validate({
        origin,
        token: csrfToken,
        ...(cookieToken === undefined ? {} : { cookieToken }),
      })
    ) {
      throw new AuthenticationError('CSRF_INVALID', 'CSRF_INVALID');
    }
  }
}
