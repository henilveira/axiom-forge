export const AUTHENTICATION_EVENT_TYPE_PREFIX = 'identity.authentication';
export const AUTHENTICATION_EVENT_VERSION = 1;
export const AUTHENTICATION_SCHEMA_VERSION = 1;
export const AUTHENTICATION_EVENT_PRODUCER = 'backend.identity';
export const AUTHENTICATION_METHODS = [
  'PASSWORD',
  'GOOGLE',
  'MAGIC_LINK',
] as const;
export const AUTHENTICATION_FAILURE_CATEGORIES = [
  'INVALID_CREDENTIAL',
  'ACCOUNT_INACTIVE',
  'CHALLENGE_INVALID',
  'OAUTH_INVALID',
  'RATE_LIMITED',
  'CSRF_INVALID',
  'PROVIDER_UNAVAILABLE',
] as const;
export const AUTHENTICATION_REGISTRATION_RESULTS = [
  'ACCEPTED',
  'DUPLICATE',
  'REJECTED',
] as const;
export const AUTHENTICATION_ENVELOPE_PART_COUNT = 4;
export const AUTHENTICATION_EVENT_NAME_INDEX = -2;
export const AUTHENTICATION_EVENT_VERSION_INDEX = -1;
export const AUTHENTICATION_MAX_IDENTIFIER_LENGTH = 128;
export const AUTHENTICATION_MAX_EVENT_STRING_LENGTH = 512;
const AUTHENTICATION_EVENT_TYPES = [
  'UserRegistrationStarted',
  'UserRegistered',
  'EmailVerificationIssued',
  'EmailVerified',
  'AuthenticationSucceeded',
  'AuthenticationFailed',
  'ExternalIdentityLinked',
  'MagicLinkIssued',
  'MagicLinkConsumed',
  'SessionStarted',
  'SessionRefreshed',
  'SessionRevoked',
  'SessionFamilyReplayDetected',
] as const;
export const AUTHENTICATION_EVENT_TYPE_SET: ReadonlySet<string> = new Set(
  AUTHENTICATION_EVENT_TYPES,
);
export const AUTHENTICATION_FORBIDDEN_FIELD_PATTERN =
  /^(password|token|cookie|authorization|secret|code_verifier|access_key|refresh_key|email|ip|user-agent)$/i;
export const AUTHENTICATION_EVENT_FIELDS: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  UserRegistrationStarted: ['type', 'result', 'emailFingerprint', 'occurredAt'],
  UserRegistered: [
    'type',
    'userId',
    'authMethod',
    'emailVerified',
    'occurredAt',
  ],
  EmailVerificationIssued: [
    'type',
    'userId',
    'challengeId',
    'expiresAt',
    'occurredAt',
  ],
  EmailVerified: ['type', 'userId', 'occurredAt'],
  AuthenticationSucceeded: ['type', 'userId', 'authMethod', 'occurredAt'],
  AuthenticationFailed: [
    'type',
    'authMethod',
    'failureCategory',
    'occurredAt',
    'emailFingerprint',
  ],
  ExternalIdentityLinked: [
    'type',
    'userId',
    'provider',
    'subjectFingerprint',
    'occurredAt',
  ],
  MagicLinkIssued: [
    'type',
    'challengeId',
    'expiresAt',
    'emailFingerprint',
    'occurredAt',
  ],
  MagicLinkConsumed: ['type', 'userId', 'challengeId', 'occurredAt'],
  SessionStarted: ['type', 'sessionId', 'userId', 'authMethod', 'occurredAt'],
  SessionRefreshed: ['type', 'sessionId', 'familyId', 'occurredAt'],
  SessionRevoked: ['type', 'sessionId', 'reasonCategory', 'occurredAt'],
  SessionFamilyReplayDetected: ['type', 'familyId', 'userId', 'occurredAt'],
};
