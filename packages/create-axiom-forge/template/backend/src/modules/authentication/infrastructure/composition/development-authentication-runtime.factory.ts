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
import type { AuthenticationConfig } from '../../application/ports/authentication-config.port';
import type { EmailDeliveryPort } from '../../application/ports/email-delivery.port';
import type { GoogleTransactionStorePort } from '../../application/ports/google-oidc.port';
import { DoubleSubmitCsrfAdapter } from '../csrf/double-submit-csrf.adapter';
import {
  HmacFingerprintAdapter,
  InMemoryPasswordBlocklist,
  NodePasswordHasher,
  NodeSessionTokenAdapter,
  SystemClock,
  SystemRandom,
} from '../crypto/node-crypto.adapter';
import { InMemoryRateLimitAdapter } from '../crypto/in-memory-rate-limit.adapter';
import { AuthenticationEmailDeliveryAdapter } from '../email/authentication-email-delivery.adapter';
import { InMemoryEmailDeliveryAdapter } from '../email/in-memory-email-delivery.adapter';
import { ResendEmailSenderAdapter } from '../email/resend-email-sender.adapter';
import { GoogleOidcAdapter } from '../external/google/google-oidc.adapter';
import { PrismaGoogleTransactionStore } from '../external/google/prisma-google-transaction.store';
import { UnavailableGoogleTransactionStore } from '../external/google/unavailable-google-transaction.store';
import { InMemoryAuthenticationRepository } from '../persistence/memory/in-memory-authentication.repository';
import { createProductionPrismaClient } from './postgres-client.factory';
import type { DevelopmentAuthenticationRuntime } from './authentication-runtime-lifecycle.types';

export function createDevelopmentAuthenticationRuntime(
  config: AuthenticationConfig,
  options: Readonly<{ readonly allowExternalEmailProvider?: boolean }> = {},
): DevelopmentAuthenticationRuntime {
  const clock = new SystemClock();
  const random = new SystemRandom();
  const repository = new InMemoryAuthenticationRepository();
  const tokenPort = new NodeSessionTokenAdapter();
  const fingerprint = new HmacFingerprintAdapter(config.fingerprintSecret);
  const passwordHasher = new NodePasswordHasher();
  const rateLimit = new InMemoryRateLimitAdapter(() => clock.now());
  const emailDelivery = resolveEmailDelivery(config, options);
  const googleTransactions = createGoogleTransactionResources(config);
  const google = createGoogleAdapter(
    config,
    random,
    clock,
    googleTransactions.store,
  );
  const core = { repository, clock, random, tokenPort, fingerprint };
  return {
    register: new RegisterWithPasswordUseCase({
      ...core,
      passwordHasher,
      passwordBlocklist: new InMemoryPasswordBlocklist(),
      emailDelivery,
      currentTermsVersion: config.termsVersion,
      emailVerificationTtlMs: config.emailVerificationTtlMs,
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
      transactions: googleTransactions.store,
      passwordHasher,
      rateLimit,
    }),
    confirmGoogleLink: new ConfirmGoogleLinkUseCase({
      ...core,
      google,
      transactions: googleTransactions.store,
      passwordHasher,
      rateLimit,
    }),
    random,
    fingerprint,
    csrf: new DoubleSubmitCsrfAdapter(config.allowedOrigins),
    config,
    initialize: googleTransactions.initialize,
    shutdown: googleTransactions.shutdown,
  };
}

function resolveEmailDelivery(
  config: AuthenticationConfig,
  options: Readonly<{ readonly allowExternalEmailProvider?: boolean }>,
): EmailDeliveryPort {
  if (
    config.emailProvider !== 'resend' ||
    options.allowExternalEmailProvider !== true ||
    isTestRuntime()
  ) {
    return new InMemoryEmailDeliveryAdapter();
  }
  return new AuthenticationEmailDeliveryAdapter(
    new ResendEmailSenderAdapter({
      apiKey: requiredConfiguration(config.resendApiKey, 'RESEND_API_KEY'),
      from: requiredConfiguration(config.emailFrom, 'EMAIL_FROM'),
    }),
    {
      from: requiredConfiguration(config.emailFrom, 'EMAIL_FROM'),
      publicBaseUrl: requiredConfiguration(
        config.authPublicBaseUrl,
        'AUTH_PUBLIC_BASE_URL',
      ),
    },
  );
}

function createGoogleTransactionResources(
  config: AuthenticationConfig,
): Readonly<{
  readonly store: GoogleTransactionStorePort;
  readonly initialize: () => Promise<void>;
  readonly shutdown: () => Promise<void>;
}> {
  if (!config.googleEnabled) {
    return {
      store: new UnavailableGoogleTransactionStore(),
      initialize: (): Promise<void> => Promise.resolve(),
      shutdown: (): Promise<void> => Promise.resolve(),
    };
  }

  const databaseUrl = requiredConfiguration(
    process.env['DATABASE_URL'],
    'DATABASE_URL for PrismaGoogleTransactionStore',
  );
  const prisma = createProductionPrismaClient(databaseUrl);
  let isInitialized = false;
  let isShutdown = false;
  return {
    store: new PrismaGoogleTransactionStore(
      prisma,
      requiredConfiguration(
        config.googleOAuthTransactionSecret,
        'GOOGLE_OAUTH_TRANSACTION_SECRET',
      ),
    ),
    initialize: async (): Promise<void> => {
      if (isInitialized) {
        return;
      }
      try {
        await prisma.$connect();
      } catch {
        throw new Error(
          'AUTH-001 development composition is unavailable: cannot connect to DATABASE_URL for PrismaGoogleTransactionStore',
        );
      }
      isInitialized = true;
    },
    shutdown: async (): Promise<void> => {
      if (isShutdown) {
        return;
      }
      isShutdown = true;
      await prisma.$disconnect();
    },
  };
}

function isTestRuntime(): boolean {
  // Keep the guard in the composition root as a second line of defense. A
  // caller must not be able to activate an external provider from Jest by
  // passing allowExternalEmailProvider directly.
  return (
    process.env['NODE_ENV'] === 'test' ||
    process.env['JEST_WORKER_ID'] !== undefined
  );
}

function requiredConfiguration(
  value: string | undefined,
  name: string,
): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `AUTH-001 development composition is unavailable: missing ${name}`,
    );
  }
  return value;
}

function createGoogleAdapter(
  config: AuthenticationConfig,
  random: SystemRandom,
  clock: SystemClock,
  transactions: GoogleTransactionStorePort,
): GoogleOidcAdapter {
  return new GoogleOidcAdapter(
    {
      enabled: config.googleEnabled,
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
    transactions,
  );
}
