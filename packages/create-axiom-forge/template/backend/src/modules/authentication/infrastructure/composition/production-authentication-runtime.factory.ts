import type { AuthenticationConfig } from '../../application/ports/authentication-config.port';
import type { AuthenticationRuntime } from '../../application/ports/authentication-runtime.port';
import type { AuthenticationLoggerPort } from '../../application/ports/logger.port';
import type { EmailDeliveryPort } from '../../application/ports/email-delivery.port';
import type { GoogleOidcPort } from '../../application/ports/google-oidc.port';
import { AuthenticateWithPasswordUseCase } from '../../application/use-cases/authenticate-with-password.use-case';
import { ConfirmGoogleLinkUseCase } from '../../application/use-cases/confirm-google-link.use-case';
import { ConsumeMagicLinkUseCase } from '../../application/use-cases/consume-magic-link.use-case';
import { HandleGoogleCallbackUseCase } from '../../application/use-cases/handle-google-callback.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { RegisterWithPasswordUseCase } from '../../application/use-cases/register-with-password.use-case';
import { RequestMagicLinkUseCase } from '../../application/use-cases/request-magic-link.use-case';
import { StartGoogleAuthUseCase } from '../../application/use-cases/start-google-auth.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { DoubleSubmitCsrfAdapter } from '../csrf/double-submit-csrf.adapter';
import {
  HmacFingerprintAdapter,
  InMemoryPasswordBlocklist,
  NodePasswordHasher,
  NodeSessionTokenAdapter,
  SystemClock,
  SystemRandom,
} from '../crypto/node-crypto.adapter';
import { GoogleOidcAdapter } from '../external/google/google-oidc.adapter';
import { UnavailableGoogleTransactionStore } from '../external/google/unavailable-google-transaction.store';
import { PrismaAuthenticationRepository } from '../persistence/prisma/prisma-authentication.repository';
import { StructuredMessagingLogger } from '../messaging/observability/messaging.logger';
import { AuthenticationRabbitMessagingRuntime } from '../messaging/rabbitmq/authentication-messaging.runtime';
import { RABBITMQ_TOPOLOGY_MODE_ASSERT } from '../messaging/rabbitmq/rabbitmq.constants';
import type {
  ProductionAuthenticationProviders,
  ProductionRuntimeDependencies,
  ProductionMessagingDependencies,
} from './production-authentication.types';
import { PrismaInboxStore } from '../messaging/inbox/prisma-inbox.store';
import { PrismaOutboxStore } from '../messaging/outbox/prisma-outbox.store';
import { createProductionPrismaClient } from './postgres-client.factory';
import type { PrismaClient } from '../../../../generated/prisma/client';
import { AuthenticationEmailDeliveryAdapter } from '../email/authentication-email-delivery.adapter';
import { ResendEmailSenderAdapter } from '../email/resend-email-sender.adapter';

export function createProductionAuthenticationRuntime(
  config: AuthenticationConfig,
  providers: ProductionAuthenticationProviders = {},
): AuthenticationRuntime {
  return createRuntime(createProductionDependencies(config, providers));
}

function createProductionDependencies(
  config: AuthenticationConfig,
  providers: ProductionAuthenticationProviders,
): ProductionRuntimeDependencies {
  const logger = providers.logger ?? new StructuredMessagingLogger();
  const repository =
    providers.repository ??
    new PrismaAuthenticationRepository(
      resolveProductionPrismaClient(providers),
      logger,
    );
  const messagingStores = createMessagingStores(providers);
  const emailDelivery = resolveEmailDelivery(config, providers);
  const rateLimit = requiredProvider(
    providers.rateLimit,
    'distributed rate limit',
  );
  // ponytail: password blocklist is a static curated list of known-compromised
  // passwords (application/policies/password.constants.ts), not mutable fake
  // persistence — safe to wire directly in production unless overridden.
  const passwordBlocklist =
    providers.passwordBlocklist ?? new InMemoryPasswordBlocklist();
  const { google, googleTransactions } = resolveGoogleDependencies(
    config,
    providers,
  );
  const messaging = resolveMessagingRuntime(
    config,
    providers,
    messagingStores,
    logger,
  );
  const crypto = createProductionCrypto(config);
  return {
    config,
    logger,
    repository,
    emailDelivery,
    rateLimit,
    passwordBlocklist,
    google,
    googleTransactions,
    ...crypto,
    messaging,
  };
}

function resolveEmailDelivery(
  config: AuthenticationConfig,
  providers: ProductionAuthenticationProviders,
): EmailDeliveryPort {
  if (providers.emailDelivery !== undefined) {
    return providers.emailDelivery;
  }
  const emailSender =
    providers.emailSender ??
    new ResendEmailSenderAdapter({
      apiKey: requiredConfig(config.resendApiKey, 'RESEND_API_KEY'),
      from: requiredConfig(config.emailFrom, 'EMAIL_FROM'),
    });
  return new AuthenticationEmailDeliveryAdapter(emailSender, {
    from: requiredConfig(config.emailFrom, 'EMAIL_FROM'),
    publicBaseUrl: requiredConfig(
      config.authPublicBaseUrl,
      'AUTH_PUBLIC_BASE_URL',
    ),
  });
}

function resolveGoogleDependencies(
  config: AuthenticationConfig,
  providers: ProductionAuthenticationProviders,
): Pick<ProductionRuntimeDependencies, 'google' | 'googleTransactions'> {
  const googleTransactions =
    providers.googleTransactions ?? new UnavailableGoogleTransactionStore();
  if (config.googleEnabled && providers.googleTransactions === undefined) {
    throw new Error(
      'AUTH-001 production composition is unavailable: missing sealed Google transaction store',
    );
  }
  const google = providers.google ?? createDisabledGoogleAdapter(config);
  if (config.googleEnabled && providers.google === undefined) {
    throw new Error(
      'AUTH-001 production composition is unavailable: missing approved Google OIDC adapter',
    );
  }
  return { google, googleTransactions };
}

function resolveMessagingRuntime(
  config: AuthenticationConfig,
  providers: ProductionAuthenticationProviders,
  messagingStores: Pick<
    ProductionMessagingDependencies,
    'inboxStore' | 'outboxStore'
  >,
  logger: AuthenticationLoggerPort,
): ProductionRuntimeDependencies['messaging'] {
  if (
    config.rabbitMqUrls.length === 0 ||
    providers.rabbitChannel === undefined
  ) {
    throw new Error(
      'AUTH-001 production composition is unavailable: missing RabbitMQ configuration and consumer/publisher wiring',
    );
  }
  if (process.env['RABBITMQ_TOPOLOGY_MODE'] !== RABBITMQ_TOPOLOGY_MODE_ASSERT) {
    throw new Error(
      'AUTH-001 production composition is unavailable: RABBITMQ_TOPOLOGY_MODE must be "assert"',
    );
  }
  const eventHandler = requiredProvider(
    providers.eventHandler,
    'RabbitMQ integration event handler',
  );
  return new AuthenticationRabbitMessagingRuntime({
    ...messagingStores,
    rabbitChannel: providers.rabbitChannel,
    eventHandler,
    logger,
  });
}

function createProductionCrypto(
  config: AuthenticationConfig,
): Pick<
  ProductionRuntimeDependencies,
  'clock' | 'random' | 'tokenPort' | 'fingerprint' | 'passwordHasher'
> {
  return {
    clock: new SystemClock(),
    random: new SystemRandom(),
    tokenPort: new NodeSessionTokenAdapter(),
    fingerprint: new HmacFingerprintAdapter(config.fingerprintSecret),
    passwordHasher: new NodePasswordHasher(),
  };
}

function createMessagingStores(
  providers: ProductionAuthenticationProviders,
): Pick<ProductionMessagingDependencies, 'inboxStore' | 'outboxStore'> {
  if (
    providers.inboxStore !== undefined &&
    providers.outboxStore !== undefined
  ) {
    return {
      inboxStore: providers.inboxStore,
      outboxStore: providers.outboxStore,
    };
  }
  const prisma = resolveProductionPrismaClient(providers);
  return {
    inboxStore: providers.inboxStore ?? new PrismaInboxStore(prisma),
    outboxStore: providers.outboxStore ?? new PrismaOutboxStore(prisma),
  };
}

let cachedProductionPrismaClient: PrismaClient | undefined;

/**
 * Resolves the PrismaClient used by the repository and durable Inbox/Outbox
 * stores. Prefers an explicitly injected client (tests, DI overrides); falls
 * back to building one from `DATABASE_URL` with the approved
 * `@prisma/adapter-pg` driver adapter — the fix for the AUTH-BE-T02 blocker
 * where `new PrismaClient()` throws unconditionally on Prisma 7 without an
 * adapter. Fails closed with no `DATABASE_URL`.
 */
function resolveProductionPrismaClient(
  providers: ProductionAuthenticationProviders,
): PrismaClient {
  if (providers.prisma !== undefined) {
    return providers.prisma;
  }
  if (cachedProductionPrismaClient !== undefined) {
    return cachedProductionPrismaClient;
  }
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error(
      'AUTH-001 production composition is unavailable: missing DATABASE_URL for the approved PostgreSQL driver',
    );
  }
  cachedProductionPrismaClient = createProductionPrismaClient(databaseUrl);
  return cachedProductionPrismaClient;
}

function createRuntime(
  dependencies: ProductionRuntimeDependencies,
): AuthenticationRuntime {
  const {
    config,
    logger,
    repository,
    emailDelivery,
    rateLimit,
    passwordBlocklist,
    google,
    googleTransactions,
    clock,
    random,
    tokenPort,
    fingerprint,
    passwordHasher,
    messaging,
  } = dependencies;
  const core = { repository, clock, random, tokenPort, fingerprint };
  return {
    register: new RegisterWithPasswordUseCase({
      ...core,
      passwordHasher,
      passwordBlocklist,
      emailDelivery,
      currentTermsVersion: config.termsVersion,
      emailVerificationTtlMs: config.emailVerificationTtlMs,
      logger,
    }),
    verifyEmail: new VerifyEmailUseCase(repository, tokenPort, clock),
    login: new AuthenticateWithPasswordUseCase({
      ...core,
      passwordHasher,
      rateLimit,
    }),
    requestMagicLink: new RequestMagicLinkUseCase({
      ...core,
      emailDelivery,
      rateLimit,
      logger,
    }),
    consumeMagicLink: new ConsumeMagicLinkUseCase(
      repository,
      tokenPort,
      random,
      clock,
    ),
    refreshSession: new RefreshSessionUseCase(
      repository,
      tokenPort,
      random,
      clock,
    ),
    logout: new LogoutUseCase(repository, tokenPort, clock),
    startGoogle: new StartGoogleAuthUseCase(google, rateLimit),
    googleCallback: new HandleGoogleCallbackUseCase({
      ...core,
      google,
      transactions: googleTransactions,
      passwordHasher,
      rateLimit,
    }),
    confirmGoogleLink: new ConfirmGoogleLinkUseCase({
      ...core,
      google,
      transactions: googleTransactions,
      passwordHasher,
      rateLimit,
    }),
    random,
    fingerprint,
    csrf: new DoubleSubmitCsrfAdapter(config.allowedOrigins),
    config,
    messaging,
  };
}

function requiredProvider<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(
      `AUTH-001 production composition is unavailable: missing ${name}`,
    );
  }
  return value;
}

function requiredConfig(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `AUTH-001 production composition is unavailable: missing ${name}`,
    );
  }
  return value;
}

function createDisabledGoogleAdapter(
  config: AuthenticationConfig,
): GoogleOidcPort {
  const clock = new SystemClock();
  const random = new SystemRandom();
  return new GoogleOidcAdapter(
    {
      enabled: false,
      issuer: config.googleIssuer,
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      authorizationEndpoint: config.googleAuthorizationEndpoint,
      tokenEndpoint: config.googleTokenEndpoint,
      jwksUri: config.googleJwksUri,
      redirectUri: config.googleRedirectUri,
    },
    random,
    clock,
    new UnavailableGoogleTransactionStore(),
  );
}
