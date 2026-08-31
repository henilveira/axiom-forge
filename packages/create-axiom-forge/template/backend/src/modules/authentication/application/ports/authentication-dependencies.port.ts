import type { DomainClockPort } from '../../domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../domain/ports/domain-random.port';
import type { AuthenticationRepositoryPort } from './authentication-repository.port';
import type { EmailDeliveryPort } from './email-delivery.port';
import type { FingerprintPort } from './fingerprint.port';
import type { PasswordBlocklistPort } from './password-blocklist.port';
import type { PasswordHasherPort } from './password-hasher.port';
import type { RateLimitPort } from './rate-limit.port';
import type { SessionTokenPort } from './session-token.port';
import type { AuthenticationLoggerPort } from './logger.port';

export interface CoreAuthenticationDependencies {
  readonly repository: AuthenticationRepositoryPort;
  readonly clock: DomainClockPort;
  readonly random: DomainRandomPort;
  readonly tokenPort: SessionTokenPort;
  readonly fingerprint: FingerprintPort;
}

export interface PasswordRegistrationDependencies extends CoreAuthenticationDependencies {
  readonly passwordHasher: PasswordHasherPort;
  readonly passwordBlocklist: PasswordBlocklistPort;
  readonly emailDelivery: EmailDeliveryPort;
  readonly currentTermsVersion: string;
  readonly emailVerificationTtlMs: number;
  readonly logger?: AuthenticationLoggerPort;
}

export interface PasswordAuthenticationDependencies extends CoreAuthenticationDependencies {
  readonly passwordHasher: PasswordHasherPort;
  readonly rateLimit: RateLimitPort;
}

export interface MagicLinkDependencies extends CoreAuthenticationDependencies {
  readonly emailDelivery: EmailDeliveryPort;
  readonly rateLimit: RateLimitPort;
  readonly logger?: AuthenticationLoggerPort;
}
