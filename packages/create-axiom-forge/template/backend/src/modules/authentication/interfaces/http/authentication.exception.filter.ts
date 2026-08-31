import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { AuthenticationError } from '../../domain/errors/authentication.error';
import type { HttpResponseLike } from './http.types';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_UNAUTHORIZED,
} from './http.constants';
import { AUTHENTICATION_PUBLIC_ERROR_CODES } from './authentication-http.constants';

@Catch()
export class AuthenticationExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponseLike>();
    if (
      !(exception instanceof AuthenticationError) &&
      !(exception instanceof TypeError)
    ) {
      response
        .status(HTTP_INTERNAL_SERVER_ERROR)
        .json({ code: 'AUTH_UNAVAILABLE' });
      return;
    }
    response
      .status(
        exception instanceof AuthenticationError
          ? this.statusFor(exception.code)
          : HTTP_BAD_REQUEST,
      )
      .json({
        code:
          exception instanceof AuthenticationError
            ? this.publicCode(exception.code)
            : 'AUTH_FAILED',
      });
  }

  private statusFor(code: AuthenticationError['code']): number {
    if (code === 'RATE_LIMITED') {
      return HTTP_TOO_MANY_REQUESTS;
    }
    if (code === 'PROVIDER_UNAVAILABLE') {
      return HTTP_SERVICE_UNAVAILABLE;
    }
    if (code === 'INVALID_INPUT') {
      return HTTP_BAD_REQUEST;
    }
    return HTTP_UNAUTHORIZED;
  }

  private publicCode(code: AuthenticationError['code']): string {
    return AUTHENTICATION_PUBLIC_ERROR_CODES[code];
  }
}
