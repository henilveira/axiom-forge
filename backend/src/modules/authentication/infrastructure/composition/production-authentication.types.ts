import type { PrismaClient } from '../../../../generated/prisma/client';
import type { AuthenticationRepositoryPort } from '../../application/ports/authentication-repository.port';
import type { AuthenticationConfig } from '../../application/ports/authentication-config.port';
import type { AuthenticationMessagingRuntime } from '../../application/ports/authentication-runtime.port';
import type { DomainClockPort } from '../../domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../domain/ports/domain-random.port';
import type { EmailDeliveryPort } from '../../application/ports/email-delivery.port';
import type { EmailSenderPort } from '../../application/ports/email-sender.port';
import type {
  GoogleOidcPort,
  GoogleTransactionStorePort,
} from '../../application/ports/google-oidc.port';
import type { PasswordBlocklistPort } from '../../application/ports/password-blocklist.port';
import type { RateLimitPort } from '../../application/ports/rate-limit.port';
import type { FingerprintPort } from '../../application/ports/fingerprint.port';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port';
import type { SessionTokenPort } from '../../application/ports/session-token.port';
import type {
  InboxStorePort,
  OutboxStorePort,
  RabbitConsumerChannelPort,
  IntegrationEventHandlerPort,
} from '../../application/ports/messaging.types';
import type { AuthenticationLoggerPort } from '../../application/ports/logger.port';

export const AUTHENTICATION_PRODUCTION_PROVIDERS = Symbol(
  'AUTHENTICATION_PRODUCTION_PROVIDERS',
);

export interface ProductionMessagingDependencies {
  readonly config: AuthenticationConfig;
  readonly inboxStore: InboxStorePort;
  readonly outboxStore: OutboxStorePort;
  readonly rabbitChannel: RabbitConsumerChannelPort;
  readonly eventHandler: IntegrationEventHandlerPort;
  readonly logger: AuthenticationLoggerPort;
}

export interface ProductionAuthenticationProviders {
  readonly prisma?: PrismaClient;
  readonly repository?: AuthenticationRepositoryPort;
  readonly emailDelivery?: EmailDeliveryPort;
  readonly emailSender?: EmailSenderPort;
  readonly rateLimit?: RateLimitPort;
  readonly passwordBlocklist?: PasswordBlocklistPort;
  readonly google?: GoogleOidcPort;
  readonly googleTransactions?: GoogleTransactionStorePort;
  readonly inboxStore?: InboxStorePort;
  readonly outboxStore?: OutboxStorePort;
  readonly rabbitChannel?: RabbitConsumerChannelPort;
  readonly eventHandler?: IntegrationEventHandlerPort;
  readonly logger?: AuthenticationLoggerPort;
}

export interface ProductionRuntimeDependencies {
  readonly config: AuthenticationConfig;
  readonly logger: AuthenticationLoggerPort;
  readonly repository: AuthenticationRepositoryPort;
  readonly emailDelivery: EmailDeliveryPort;
  readonly rateLimit: RateLimitPort;
  readonly passwordBlocklist: PasswordBlocklistPort;
  readonly google: GoogleOidcPort;
  readonly googleTransactions: GoogleTransactionStorePort;
  readonly clock: DomainClockPort;
  readonly random: DomainRandomPort;
  readonly tokenPort: SessionTokenPort;
  readonly fingerprint: FingerprintPort;
  readonly passwordHasher: PasswordHasherPort;
  readonly messaging: AuthenticationMessagingRuntime;
}
