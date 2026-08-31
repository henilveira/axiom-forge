export interface RegisterBody {
  readonly email: string;
  readonly password: string;
  readonly termsVersion: string;
}

export interface PasswordLoginBody {
  readonly email: string;
  readonly password: string;
}

export interface MagicLinkBody {
  readonly email: string;
}

export interface GoogleLinkBody {
  readonly password?: string;
  readonly magicToken?: string;
}

export function parseRegisterBody(value: unknown): RegisterBody {
  const body = asRecord(value);
  return {
    email: requiredString(body['email']),
    password: requiredString(body['password']),
    termsVersion: requiredString(body['termsVersion']),
  };
}

export function parsePasswordLoginBody(value: unknown): PasswordLoginBody {
  const body = asRecord(value);
  return {
    email: requiredString(body['email']),
    password: requiredString(body['password']),
  };
}

export function parseMagicLinkBody(value: unknown): MagicLinkBody {
  const body = asRecord(value);
  return { email: requiredString(body['email']) };
}

export function parseGoogleLinkBody(value: unknown): GoogleLinkBody {
  const body = asRecord(value);
  const password = optionalString(body['password']);
  const magicToken = optionalString(body['magicToken']);
  if (password === undefined && magicToken === undefined) {
    throw new TypeError('proof-required');
  }
  return {
    ...(password === undefined ? {} : { password }),
    ...(magicToken === undefined ? {} : { magicToken }),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError('object-required');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('string-required');
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredString(value);
}
