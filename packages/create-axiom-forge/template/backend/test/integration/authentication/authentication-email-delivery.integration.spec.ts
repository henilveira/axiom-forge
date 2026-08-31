import type { DomainClockPort } from '../../../src/modules/authentication/domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../../src/modules/authentication/domain/ports/domain-random.port';
import type { PasswordHasherPort } from '../../../src/modules/authentication/application/ports/password-hasher.port';
import type { RateLimitPort } from '../../../src/modules/authentication/application/ports/rate-limit.port';
import { ConsumeMagicLinkUseCase } from '../../../src/modules/authentication/application/use-cases/consume-magic-link.use-case';
import { RegisterWithPasswordUseCase } from '../../../src/modules/authentication/application/use-cases/register-with-password.use-case';
import { RequestMagicLinkUseCase } from '../../../src/modules/authentication/application/use-cases/request-magic-link.use-case';
import { VerifyEmailUseCase } from '../../../src/modules/authentication/application/use-cases/verify-email.use-case';
import { InMemoryPasswordBlocklist } from '../../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import {
  HmacFingerprintAdapter,
  NodeSessionTokenAdapter,
} from '../../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import { AuthenticationEmailDeliveryAdapter } from '../../../src/modules/authentication/infrastructure/email/authentication-email-delivery.adapter';
import { CapturingEmailSender } from '../../test-kit/authentication-email-fakes';
import { authenticationContext } from '../../test-kit/authentication.builders';

const EMAIL = 'Person+Auth@example.com';
const NORMALIZED_EMAIL = 'person+auth@example.com';
const PASSWORD = 'A sufficiently long password';
const FROM = 'Example App <no-reply@example.com>';
const PUBLIC_BASE_URL = 'https://api.example.com';

class MutableClock implements DomainClockPort {
  public constructor(private current: Date) {}

  public now(): Date {
    return new Date(this.current.getTime());
  }

  public at(millisecondsFromNow: number): Date {
    return new Date(this.current.getTime() + millisecondsFromNow);
  }

  public refreshTtlMs(): number {
    return 30 * 24 * 60 * 60 * 1_000;
  }

  public advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

class SequenceRandom implements DomainRandomPort {
  private idCounter = 0;
  private byteCounter = 0;

  public bytes(size: number): Uint8Array {
    this.byteCounter += 1;
    return new Uint8Array(size).fill(this.byteCounter);
  }

  public id(): string {
    this.idCounter += 1;
    return `00000000-0000-4000-8000-${String(this.idCounter).padStart(12, '0')}`;
  }
}

class FakePasswordHasher implements PasswordHasherPort {
  public readonly dummyHash = 'dummy-password-hash';

  public hash(password: string): string {
    return `fake:${password}`;
  }

  public verify(password: string, encodedHash: string): boolean {
    return encodedHash === `fake:${password}`;
  }
}

class AllowAllRateLimit implements RateLimitPort {
  public check(): boolean {
    return true;
  }

  public record(): void {
    return undefined;
  }
}

function tokenFromMessage(messageText: string | undefined): string {
  if (messageText === undefined) {
    throw new Error('captured e-mail has no text body');
  }
  const link = messageText
    .split('\n')
    .find((line) => line.startsWith('https://'));
  if (link === undefined) {
    throw new Error('captured e-mail has no authentication link');
  }
  const token = new URL(link).searchParams.get('token');
  if (token === null) {
    throw new Error('captured authentication link has no token');
  }
  return token;
}

function setup() {
  const repository = new InMemoryAuthenticationRepository();
  const clock = new MutableClock(new Date('2026-08-28T12:00:00.000Z'));
  const random = new SequenceRandom();
  const tokenPort = new NodeSessionTokenAdapter();
  const fingerprint = new HmacFingerprintAdapter(
    'auth-email-test-fingerprint-secret',
  );
  const passwordHasher = new FakePasswordHasher();
  const sender = new CapturingEmailSender();
  const emailDelivery = new AuthenticationEmailDeliveryAdapter(sender, {
    from: FROM,
    publicBaseUrl: PUBLIC_BASE_URL,
  });
  const rateLimit = new AllowAllRateLimit();
  const register = new RegisterWithPasswordUseCase({
    repository,
    clock,
    random,
    tokenPort,
    fingerprint,
    passwordHasher,
    passwordBlocklist: new InMemoryPasswordBlocklist([]),
    emailDelivery,
    currentTermsVersion: 'v1',
    emailVerificationTtlMs: 60 * 60 * 1_000,
  });
  return {
    repository,
    clock,
    random,
    tokenPort,
    fingerprint,
    passwordHasher,
    sender,
    emailDelivery,
    rateLimit,
    register,
  };
}

describe('AUTH-001 authentication e-mail delivery', () => {
  it(
    'captures registration verification, consumes it once, and redacts token and e-mail from events (BR-03/BR-10, AC-01/04)',
    captureRegistrationVerification,
  );
  it(
    'returns the same magic-link outcome for unknown and ineligible accounts, sends only to an active account, and consumes once (BR-06/BR-08/BR-10, AC-12/13/14)',
    captureAndConsumeMagicLink,
  );
  it(
    'rejects an expired magic link without creating a session and keeps the public failure generic (BR-06/BR-08, AC-14)',
    rejectExpiredMagicLink,
  );
});

async function captureRegistrationVerification(): Promise<void> {
  const state = setup();
  await expect(
    state.register.execute({
      email: `  ${EMAIL} `,
      password: PASSWORD,
      termsVersion: 'v1',
      context: authenticationContext({ correlationId: 'registration-1' }),
    }),
  ).resolves.toEqual({ outcome: 'ACCEPTED' });

  expect(state.sender.messages).toHaveLength(1);
  const verificationMessage = state.sender.messages[0];
  expect(verificationMessage?.metadata).toEqual({
    category: 'EMAIL_VERIFICATION',
  });
  expect(verificationMessage?.from).toBe(FROM);
  expect(verificationMessage?.to).toBe(NORMALIZED_EMAIL);
  const verificationToken = tokenFromMessage(verificationMessage?.text);
  expect(verificationToken).not.toHaveLength(0);
  const pending = await state.repository.withTransaction((repository) =>
    repository.findUserByEmail(NORMALIZED_EMAIL),
  );
  expect(pending?.status).toBe('EMAIL_VERIFICATION_PENDING');
  const initialEvents = JSON.stringify(state.repository.getOutbox());
  expect(initialEvents).not.toContain(verificationToken);
  expect(initialEvents).not.toContain(NORMALIZED_EMAIL);

  const verify = new VerifyEmailUseCase(
    state.repository,
    state.tokenPort,
    state.clock,
  );
  await expect(
    verify.execute({
      token: verificationToken,
      context: authenticationContext({ correlationId: 'verification-1' }),
    }),
  ).resolves.toEqual({ outcome: 'ACCEPTED' });
  await expect(
    verify.execute({
      token: verificationToken,
      context: authenticationContext({ correlationId: 'verification-2' }),
    }),
  ).resolves.toEqual({ outcome: 'REJECTED' });

  const active = await state.repository.withTransaction((repository) =>
    repository.findUserByEmail(NORMALIZED_EMAIL),
  );
  expect(active?.status).toBe('ACTIVE');
  expect(active?.emailVerifiedAt).not.toBeNull();
  const events = JSON.stringify(state.repository.getOutbox());
  expect(events).not.toContain(verificationToken);
  expect(events).not.toContain(NORMALIZED_EMAIL);
}

async function captureAndConsumeMagicLink(): Promise<void> {
  const state = setup();
  const requestMagicLink = createMagicLinkRequest(state);
  await state.register.execute({
    email: EMAIL,
    password: PASSWORD,
    termsVersion: 'v1',
    context: authenticationContext(),
  });

  const unknown = await requestMagicLink.execute({
    email: 'unknown@example.com',
    fingerprint: 'request-fingerprint',
    context: authenticationContext({ correlationId: 'unknown-1' }),
  });
  const pending = await requestMagicLink.execute({
    email: EMAIL,
    fingerprint: 'request-fingerprint',
    context: authenticationContext({ correlationId: 'pending-1' }),
  });
  expect(unknown).toEqual({ outcome: 'ACCEPTED' });
  expect(pending).toEqual(unknown);
  expect(state.sender.messages).toHaveLength(1);

  const verificationToken = tokenFromMessage(state.sender.messages[0]?.text);
  await new VerifyEmailUseCase(
    state.repository,
    state.tokenPort,
    state.clock,
  ).execute({ token: verificationToken, context: authenticationContext() });

  const activeRequest = await requestMagicLink.execute({
    email: `  ${EMAIL.toLowerCase()} `,
    fingerprint: 'request-fingerprint',
    context: authenticationContext({ correlationId: 'active-1' }),
  });
  expect(activeRequest).toEqual({ outcome: 'ACCEPTED' });
  expect(state.sender.messages).toHaveLength(2);
  const magicMessage = state.sender.messages[1];
  expect(magicMessage?.metadata).toEqual({ category: 'MAGIC_LOGIN' });
  expect(magicMessage?.to).toBe(NORMALIZED_EMAIL);
  const magicToken = tokenFromMessage(magicMessage?.text);
  const consume = new ConsumeMagicLinkUseCase(
    state.repository,
    state.tokenPort,
    state.random,
    state.clock,
  );
  await expect(
    consume.execute({
      token: magicToken,
      context: authenticationContext({ correlationId: 'consume-1' }),
    }),
  ).resolves.toMatchObject({ outcome: 'SUCCESS', authMethod: 'MAGIC_LINK' });
  await expect(
    consume.execute({
      token: magicToken,
      context: authenticationContext({ correlationId: 'consume-2' }),
    }),
  ).rejects.toMatchObject({ code: 'CHALLENGE_INVALID' });
  const events = JSON.stringify(state.repository.getOutbox());
  expect(events).not.toContain(magicToken);
  expect(events).not.toContain(NORMALIZED_EMAIL);
}

async function rejectExpiredMagicLink(): Promise<void> {
  const state = setup();
  const requestMagicLink = createMagicLinkRequest(state);
  const createSessionSpy = jest.spyOn(
    state.repository,
    'createSessionForActiveUser',
  );
  await registerAndVerify(state);
  await requestMagicLink.execute({
    email: EMAIL,
    fingerprint: 'request-fingerprint',
    context: authenticationContext(),
  });
  const magicToken = tokenFromMessage(state.sender.messages[1]?.text);
  state.clock.advance(10 * 60 * 1_000);
  await expect(
    new ConsumeMagicLinkUseCase(
      state.repository,
      state.tokenPort,
      state.random,
      state.clock,
    ).execute({
      token: magicToken,
      context: authenticationContext(),
    }),
  ).rejects.toMatchObject({
    code: 'CHALLENGE_INVALID',
    message: 'CHALLENGE_INVALID',
  });
  expect(createSessionSpy).not.toHaveBeenCalled();
}

function createMagicLinkRequest(
  state: ReturnType<typeof setup>,
): RequestMagicLinkUseCase {
  return new RequestMagicLinkUseCase({
    repository: state.repository,
    clock: state.clock,
    random: state.random,
    tokenPort: state.tokenPort,
    fingerprint: state.fingerprint,
    emailDelivery: state.emailDelivery,
    rateLimit: state.rateLimit,
  });
}

async function registerAndVerify(
  state: ReturnType<typeof setup>,
): Promise<void> {
  await state.register.execute({
    email: EMAIL,
    password: PASSWORD,
    termsVersion: 'v1',
    context: authenticationContext(),
  });
  const verificationToken = tokenFromMessage(state.sender.messages[0]?.text);
  await new VerifyEmailUseCase(
    state.repository,
    state.tokenPort,
    state.clock,
  ).execute({ token: verificationToken, context: authenticationContext() });
}
