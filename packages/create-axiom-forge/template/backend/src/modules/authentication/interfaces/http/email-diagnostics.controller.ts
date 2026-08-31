import { timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Get,
  Inject,
  Optional,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AUTHENTICATION_RUNTIME,
  type AuthenticationRuntime,
} from '../../application/ports/authentication-runtime.port';
import {
  EMAIL_SENT_READER,
  type EmailSentReaderPort,
  type SentEmailList,
  type SentEmailMetadata,
} from '../../application/ports/email-reader.port';
import {
  MAX_EMAIL_DIAGNOSTIC_SUBJECT_LENGTH,
  SAFE_EMAIL_DIAGNOSTIC_SUBJECTS,
} from './email-diagnostics.constants';
import { parseEmailDiagnosticsQuery } from './email-diagnostics.dto';
import { EMAIL_DIAGNOSTICS_SWAGGER } from './email-diagnostics.swagger.constants';
import {
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_SERVICE_UNAVAILABLE,
} from './http.constants';
import type { HttpRequestLike, HttpResponseLike } from './http.types';

const DIAGNOSTIC_SECRET_HEADER = 'x-auth-email-diagnostic-secret';

@ApiTags('internal')
@Controller('internal/auth')
export class EmailDiagnosticsController {
  public constructor(
    @Inject(AUTHENTICATION_RUNTIME)
    private readonly runtime: AuthenticationRuntime,
    @Optional()
    @Inject(EMAIL_SENT_READER)
    private readonly reader: EmailSentReaderPort | undefined,
  ) {}

  @ApiOperation(EMAIL_DIAGNOSTICS_SWAGGER.operation)
  @ApiHeader(EMAIL_DIAGNOSTICS_SWAGGER.secretHeader)
  @ApiQuery(EMAIL_DIAGNOSTICS_SWAGGER.limitQuery)
  @ApiQuery(EMAIL_DIAGNOSTICS_SWAGGER.afterQuery)
  @ApiQuery(EMAIL_DIAGNOSTICS_SWAGGER.beforeQuery)
  @ApiResponse(EMAIL_DIAGNOSTICS_SWAGGER.success)
  @ApiResponse(EMAIL_DIAGNOSTICS_SWAGGER.invalidQuery)
  @ApiResponse(EMAIL_DIAGNOSTICS_SWAGGER.notFound)
  @ApiResponse(EMAIL_DIAGNOSTICS_SWAGGER.unavailable)
  @Get('email/sent')
  public async listSentEmails(
    @Query() query: unknown,
    @Req() request: HttpRequestLike,
    @Res() response: HttpResponseLike,
  ): Promise<void> {
    if (!this.isAuthorized(request)) {
      response.status(HTTP_NOT_FOUND).json({ code: 'NOT_FOUND' });
      return;
    }
    const reader = this.reader;
    if (reader === undefined) {
      response
        .status(HTTP_SERVICE_UNAVAILABLE)
        .json({ code: 'EMAIL_DIAGNOSTICS_UNAVAILABLE' });
      return;
    }
    const parsedQuery = parseEmailDiagnosticsQuery(query);
    try {
      const result = await reader.listSentEmails(parsedQuery);
      response.status(HTTP_OK).json(redactSentEmailList(result));
    } catch {
      response
        .status(HTTP_SERVICE_UNAVAILABLE)
        .json({ code: 'EMAIL_DIAGNOSTICS_UNAVAILABLE' });
    }
  }

  private isAuthorized(request: HttpRequestLike): boolean {
    return (
      this.runtime.config.emailDiagnosticsEnabled &&
      isLoopbackIp(request.ip) &&
      isAllowedOrigin(
        readSingleHeader(request.headers['origin']),
        this.runtime.config.allowedOrigins,
      ) &&
      hasMatchingSecret(
        readSingleHeader(request.headers[DIAGNOSTIC_SECRET_HEADER]),
        this.runtime.config.emailDiagnosticsSecret,
      )
    );
  }
}

function redactSentEmailList(result: SentEmailList): SentEmailList {
  return {
    object: 'list',
    hasMore: result.hasMore,
    data: result.data.map(redactSentEmailMetadata),
  };
}

function redactSentEmailMetadata(email: SentEmailMetadata): SentEmailMetadata {
  return {
    id: email.id,
    to: email.to.map(redactMailbox),
    from: redactMailbox(email.from),
    createdAt: email.createdAt,
    subject: redactSubject(email.subject),
    lastEvent: email.lastEvent,
  };
}

function redactSubject(value: string): string {
  const normalized = value.replace(/[\r\n\t]/g, ' ').trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_EMAIL_DIAGNOSTIC_SUBJECT_LENGTH ||
    !SAFE_EMAIL_DIAGNOSTIC_SUBJECTS.includes(normalized)
  ) {
    return '[redacted]';
  }
  return normalized;
}

function redactMailbox(value: string): string {
  const opening = value.lastIndexOf('<');
  const closing = value.lastIndexOf('>');
  const mailbox =
    opening >= 0 && closing === value.length - 1
      ? value.slice(opening + 1, closing).trim()
      : value.trim();
  const atIndex = mailbox.indexOf('@');
  if (atIndex <= 0 || atIndex === mailbox.length - 1) {
    return '[redacted]';
  }
  const localPart = mailbox.slice(0, atIndex);
  const domainPart = mailbox.slice(atIndex + 1);
  return `${localPart.slice(0, 1)}***@${domainPart.slice(0, 1)}***`;
}

function readSingleHeader(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function hasMatchingSecret(
  received: string | undefined,
  expected: string,
): boolean {
  const receivedBytes = Buffer.from(received ?? '');
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

function isLoopbackIp(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.replace(/^::ffff:/, '');
  return normalized === '127.0.0.1' || normalized === '::1';
}

function isAllowedOrigin(
  value: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  if (value === undefined) {
    return true;
  }
  if (!allowedOrigins.has(value)) {
    return false;
  }
  try {
    const origin = new URL(value);
    return (
      origin.protocol === 'http:' &&
      (origin.hostname === 'localhost' ||
        origin.hostname === '127.0.0.1' ||
        origin.hostname === '[::1]') &&
      origin.pathname === '/' &&
      origin.search.length === 0 &&
      origin.hash.length === 0
    );
  } catch {
    return false;
  }
}
