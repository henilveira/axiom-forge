import type { AuthenticationContext } from '../../src/modules/authentication/domain/types/authentication.types';

export function authenticationContext(
  overrides: Partial<AuthenticationContext> = {},
): AuthenticationContext {
  return {
    correlationId: 'test-correlation-id',
    browserBinding: 'test-browser-binding',
    ...overrides,
  };
}

export function isoDate(value = '2026-08-27T12:00:00.000Z'): string {
  return value;
}
