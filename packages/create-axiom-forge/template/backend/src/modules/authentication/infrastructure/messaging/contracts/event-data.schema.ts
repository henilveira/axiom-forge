import {
  AUTHENTICATION_EVENT_FIELDS,
  AUTHENTICATION_FAILURE_CATEGORIES,
  AUTHENTICATION_FORBIDDEN_FIELD_PATTERN,
  AUTHENTICATION_METHODS,
  AUTHENTICATION_MAX_EVENT_STRING_LENGTH,
  AUTHENTICATION_REGISTRATION_RESULTS,
} from './event.constants';

export function isStrictAuthenticationEventData(
  value: unknown,
  expectedType?: string,
): value is Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    return false;
  }
  if (
    Object.keys(value).some((key) =>
      AUTHENTICATION_FORBIDDEN_FIELD_PATTERN.test(key),
    ) ||
    Object.values(value).some((field) => !isSafeScalar(field))
  ) {
    return false;
  }
  const type = value['type'];
  return (
    typeof type === 'string' &&
    type === expectedType &&
    hasExactKeys(value, type) &&
    hasValidFieldTypes(value, type)
  );
}

function isSafeScalar(value: unknown): boolean {
  return (
    value == null ||
    typeof value === 'boolean' ||
    (typeof value === 'string' &&
      value.length <= AUTHENTICATION_MAX_EVENT_STRING_LENGTH)
  );
}

function hasExactKeys(value: Record<string, unknown>, type: string): boolean {
  const fields = AUTHENTICATION_EVENT_FIELDS[type];
  if (fields === undefined) {
    return false;
  }
  const keys = Object.keys(value);
  const isAuthenticationFailure = type === 'AuthenticationFailed';
  const hasOptionalFingerprint = Object.prototype.hasOwnProperty.call(
    value,
    'emailFingerprint',
  );
  let expectedLength = fields.length;
  if (isAuthenticationFailure && !hasOptionalFingerprint) {
    expectedLength -= 1;
  }
  return (
    keys.length === expectedLength &&
    keys.every((key) => fields.includes(key)) &&
    (!isAuthenticationFailure ||
      !hasOptionalFingerprint ||
      typeof value['emailFingerprint'] === 'string')
  );
}

function hasValidFieldTypes(
  value: Record<string, unknown>,
  type: string,
): boolean {
  return (
    isTimestamp(value['occurredAt']) &&
    (EVENT_DATA_VALIDATORS[type]?.(value) ?? false)
  );
}

type EventDataValidator = (value: Record<string, unknown>) => boolean;

const EVENT_DATA_VALIDATORS: Readonly<Record<string, EventDataValidator>> = {
  ['UserRegistrationStarted']: (value) =>
    isOneOf(value['result'], AUTHENTICATION_REGISTRATION_RESULTS) &&
    isNonEmptyString(value['emailFingerprint']),
  ['UserRegistered']: (value) =>
    isNonEmptyString(value['userId']) &&
    isAuthenticationMethod(value['authMethod']) &&
    typeof value['emailVerified'] === 'boolean',
  ['EmailVerificationIssued']: (value) =>
    isNonEmptyString(value['userId']) &&
    isNonEmptyString(value['challengeId']) &&
    isTimestamp(value['expiresAt']),
  ['EmailVerified']: (value) => isNonEmptyString(value['userId']),
  ['AuthenticationSucceeded']: (value) =>
    isNonEmptyString(value['userId']) &&
    isAuthenticationMethod(value['authMethod']),
  ['AuthenticationFailed']: (value) =>
    isAuthenticationMethod(value['authMethod']) &&
    isOneOf(value['failureCategory'], AUTHENTICATION_FAILURE_CATEGORIES) &&
    (value['emailFingerprint'] === undefined ||
      isNonEmptyString(value['emailFingerprint'])),
  ['ExternalIdentityLinked']: (value) =>
    isNonEmptyString(value['userId']) &&
    value['provider'] === 'google' &&
    isNonEmptyString(value['subjectFingerprint']),
  ['MagicLinkIssued']: (value) =>
    isNonEmptyString(value['challengeId']) &&
    isTimestamp(value['expiresAt']) &&
    isNonEmptyString(value['emailFingerprint']),
  ['MagicLinkConsumed']: (value) =>
    isNonEmptyString(value['userId']) && isNonEmptyString(value['challengeId']),
  ['SessionStarted']: (value) =>
    isNonEmptyString(value['sessionId']) &&
    isNonEmptyString(value['userId']) &&
    isAuthenticationMethod(value['authMethod']),
  ['SessionRefreshed']: (value) =>
    isNonEmptyString(value['sessionId']) && isNonEmptyString(value['familyId']),
  ['SessionRevoked']: (value) =>
    isNonEmptyString(value['sessionId']) &&
    isNonEmptyString(value['reasonCategory']),
  ['SessionFamilyReplayDetected']: (value) =>
    isNonEmptyString(value['familyId']) && isNonEmptyString(value['userId']),
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isAuthenticationMethod(value: unknown): boolean {
  return isOneOf(value, AUTHENTICATION_METHODS);
}

function isOneOf(
  value: unknown,
  allowed: ReadonlyArray<string>,
): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
