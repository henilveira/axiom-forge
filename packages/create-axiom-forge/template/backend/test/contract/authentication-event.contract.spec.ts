import { parseAuthenticationEnvelope } from '../../src/modules/authentication/infrastructure/messaging/contracts/authentication-envelope.schema';
import {
  authenticationContext,
  isoDate,
} from '../test-kit/authentication.builders';

const validEnvelope = {
  messageId: 'message-1',
  eventId: 'event-1',
  eventType: 'identity.authentication.EmailVerified.v1',
  eventVersion: 1,
  schemaVersion: 1,
  occurredAt: isoDate(),
  producer: 'backend.identity',
  correlationId: authenticationContext().correlationId,
  causationId: null,
  tenantId: null,
  data: {
    type: 'EmailVerified',
    userId: 'user-1',
    occurredAt: isoDate(),
  },
};

describe('authentication event contract', () => {
  it('accepts the strict discriminated envelope', () => {
    expect(parseAuthenticationEnvelope(validEnvelope)).not.toBeNull();
  });

  it('rejects event and data type mismatch', () => {
    expect(
      parseAuthenticationEnvelope({
        ...validEnvelope,
        data: { ...validEnvelope.data, type: 'AuthenticationSucceeded' },
      }),
    ).toBeNull();
  });

  it('rejects an event from an arbitrary namespace', () => {
    expect(
      parseAuthenticationEnvelope({
        ...validEnvelope,
        eventType: 'attacker.EmailVerified.v1',
      }),
    ).toBeNull();
  });

  it('rejects nested fields and sensitive fields before the handler', () => {
    expect(
      parseAuthenticationEnvelope({
        ...validEnvelope,
        data: { ...validEnvelope.data, extra: { password: 'secret' } },
      }),
    ).toBeNull();
    expect(
      parseAuthenticationEnvelope({
        ...validEnvelope,
        data: { ...validEnvelope.data, password: 'secret' },
      }),
    ).toBeNull();
  });

  it('rejects null and wrong types in required event data', () => {
    expect(
      parseAuthenticationEnvelope({
        ...validEnvelope,
        data: { ...validEnvelope.data, userId: null },
      }),
    ).toBeNull();
    expect(
      parseAuthenticationEnvelope({
        ...validEnvelope,
        data: { ...validEnvelope.data, userId: 42 },
      }),
    ).toBeNull();
  });
});
