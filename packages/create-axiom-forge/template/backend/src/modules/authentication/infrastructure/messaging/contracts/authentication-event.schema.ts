import type { AuthenticationDomainEvent } from '../../../domain/events/authentication.event';
import type {
  AuthenticationMethod,
  FailureCategory,
} from '../../../domain/types/authentication.types';
import {
  AUTHENTICATION_MAX_EVENT_STRING_LENGTH,
  AUTHENTICATION_EVENT_TYPE_SET,
} from './event.constants';
import { isStrictAuthenticationEventData } from './event-data.schema';

export function isSupportedAuthenticationEventType(
  value: string,
): value is AuthenticationDomainEvent['type'] {
  return AUTHENTICATION_EVENT_TYPE_SET.has(value);
}

export function isSafeEventData(
  value: unknown,
  expectedType?: string,
): value is Readonly<Record<string, unknown>> {
  return isStrictAuthenticationEventData(value, expectedType);
}

export function parseStoredAuthenticationEvent(
  value: unknown,
): AuthenticationDomainEvent | null {
  if (!isRecord(value) || typeof value['type'] !== 'string') {
    return null;
  }
  if (!isSafeEventData(value, value['type'])) {
    return null;
  }
  const occurredAt = readDate(value['occurredAt']);
  if (occurredAt == null) {
    return null;
  }
  return (
    parseIdentityEvent(value, occurredAt) ??
    parseSessionEvent(value, occurredAt)
  );
}

function parseIdentityEvent(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  switch (value['type']) {
    case 'UserRegistrationStarted':
      return withRegistrationStarted(value, occurredAt);
    case 'UserRegistered':
      return withUserRegistered(value, occurredAt);
    case 'EmailVerificationIssued':
      return withVerificationIssued(value, occurredAt);
    case 'EmailVerified':
      return withUserId(value, occurredAt, 'EmailVerified');
    case 'AuthenticationSucceeded':
      return withAuthenticationSucceeded(value, occurredAt);
    case 'AuthenticationFailed':
      return withAuthenticationFailed(value, occurredAt);
    case 'ExternalIdentityLinked':
      return withExternalIdentityLinked(value, occurredAt);
    case 'MagicLinkIssued':
      return withMagicLinkIssued(value, occurredAt);
    case 'MagicLinkConsumed':
      return withMagicLinkConsumed(value, occurredAt);
    default:
      return null;
  }
}

function parseSessionEvent(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  switch (value['type']) {
    case 'SessionStarted':
      return withSessionStarted(value, occurredAt);
    case 'SessionRefreshed':
      return withSessionRefreshed(value, occurredAt);
    case 'SessionRevoked':
      return withSessionRevoked(value, occurredAt);
    case 'SessionFamilyReplayDetected':
      return withReplayDetected(value, occurredAt);
    default:
      return null;
  }
}

function withRegistrationStarted(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const result = readRegistrationResult(value['result']);
  const emailFingerprint = readString(value['emailFingerprint']);
  return result != null && emailFingerprint != null
    ? { type: 'UserRegistrationStarted', result, emailFingerprint, occurredAt }
    : null;
}

function withUserRegistered(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const userId = readString(value['userId']);
  const authMethod = readAuthenticationMethod(value['authMethod']);
  return userId != null &&
    authMethod != null &&
    typeof value['emailVerified'] === 'boolean'
    ? {
        type: 'UserRegistered',
        userId,
        authMethod,
        emailVerified: value['emailVerified'],
        occurredAt,
      }
    : null;
}

function withVerificationIssued(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const userId = readString(value['userId']);
  const challengeId = readString(value['challengeId']);
  const expiresAt = readDate(value['expiresAt']);
  return userId != null && challengeId != null && expiresAt != null
    ? {
        type: 'EmailVerificationIssued',
        userId,
        challengeId,
        expiresAt,
        occurredAt,
      }
    : null;
}

function withUserId(
  value: Record<string, unknown>,
  occurredAt: Date,
  type: 'EmailVerified',
): AuthenticationDomainEvent | null {
  const userId = readString(value['userId']);
  return userId != null ? { type, userId, occurredAt } : null;
}

function withAuthenticationSucceeded(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const userId = readString(value['userId']);
  const authMethod = readAuthenticationMethod(value['authMethod']);
  return userId != null && authMethod != null
    ? { type: 'AuthenticationSucceeded', userId, authMethod, occurredAt }
    : null;
}

function withAuthenticationFailed(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const authMethod = readAuthenticationMethod(value['authMethod']);
  const failureCategory = readFailureCategory(value['failureCategory']);
  const emailFingerprint = readOptionalString(value['emailFingerprint']);
  return authMethod != null && failureCategory != null
    ? {
        type: 'AuthenticationFailed',
        authMethod,
        failureCategory,
        ...(emailFingerprint === undefined ? {} : { emailFingerprint }),
        occurredAt,
      }
    : null;
}

function withExternalIdentityLinked(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const userId = readString(value['userId']);
  const subjectFingerprint = readString(value['subjectFingerprint']);
  return userId != null && subjectFingerprint != null
    ? {
        type: 'ExternalIdentityLinked',
        userId,
        provider: 'google',
        subjectFingerprint,
        occurredAt,
      }
    : null;
}

function withMagicLinkIssued(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const challengeId = readString(value['challengeId']);
  const expiresAt = readDate(value['expiresAt']);
  const emailFingerprint = readString(value['emailFingerprint']);
  return challengeId != null && expiresAt != null && emailFingerprint != null
    ? {
        type: 'MagicLinkIssued',
        challengeId,
        expiresAt,
        emailFingerprint,
        occurredAt,
      }
    : null;
}

function withMagicLinkConsumed(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const userId = readString(value['userId']);
  const challengeId = readString(value['challengeId']);
  return userId != null && challengeId != null
    ? { type: 'MagicLinkConsumed', userId, challengeId, occurredAt }
    : null;
}

function withSessionStarted(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const sessionId = readString(value['sessionId']);
  const userId = readString(value['userId']);
  const authMethod = readAuthenticationMethod(value['authMethod']);
  return sessionId != null && userId != null && authMethod != null
    ? { type: 'SessionStarted', sessionId, userId, authMethod, occurredAt }
    : null;
}

function withSessionRefreshed(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const sessionId = readString(value['sessionId']);
  const familyId = readString(value['familyId']);
  return sessionId != null && familyId != null
    ? { type: 'SessionRefreshed', sessionId, familyId, occurredAt }
    : null;
}

function withSessionRevoked(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const sessionId = readString(value['sessionId']);
  const reasonCategory = readString(value['reasonCategory']);
  return sessionId != null && reasonCategory != null
    ? { type: 'SessionRevoked', sessionId, reasonCategory, occurredAt }
    : null;
}

function withReplayDetected(
  value: Record<string, unknown>,
  occurredAt: Date,
): AuthenticationDomainEvent | null {
  const familyId = readString(value['familyId']);
  const userId = readString(value['userId']);
  return familyId != null && userId != null
    ? { type: 'SessionFamilyReplayDetected', familyId, userId, occurredAt }
    : null;
}

function readDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= AUTHENTICATION_MAX_EVENT_STRING_LENGTH
    ? value
    : null;
}

function readOptionalString(value: unknown): string | undefined {
  return value === undefined ? undefined : (readString(value) ?? undefined);
}

function readRegistrationResult(
  value: unknown,
): 'ACCEPTED' | 'DUPLICATE' | 'REJECTED' | null {
  switch (value) {
    case 'ACCEPTED':
    case 'DUPLICATE':
    case 'REJECTED':
      return value;
    default:
      return null;
  }
}

function readAuthenticationMethod(value: unknown): AuthenticationMethod | null {
  switch (value) {
    case 'PASSWORD':
    case 'GOOGLE':
    case 'MAGIC_LINK':
      return value;
    default:
      return null;
  }
}

function readFailureCategory(value: unknown): FailureCategory | null {
  switch (value) {
    case 'INVALID_CREDENTIAL':
    case 'ACCOUNT_INACTIVE':
    case 'CHALLENGE_INVALID':
    case 'OAUTH_INVALID':
    case 'RATE_LIMITED':
    case 'CSRF_INVALID':
    case 'PROVIDER_UNAVAILABLE':
      return value;
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
