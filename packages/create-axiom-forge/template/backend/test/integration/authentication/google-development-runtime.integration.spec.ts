import { randomUUID } from 'node:crypto';
import { createDevelopmentAuthenticationRuntime } from '../../../src/modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import type { AuthenticationConfig } from '../../../src/modules/authentication/application/ports/authentication-config.port';
import { PrismaGoogleTransactionStore } from '../../../src/modules/authentication/infrastructure/external/google/prisma-google-transaction.store';
import { createProductionPrismaClient } from '../../../src/modules/authentication/infrastructure/composition/postgres-client.factory';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { GoogleOAuthTransactionSealer } from '../../../src/modules/authentication/infrastructure/external/google/google-transaction.sealer';

const databaseUrl = process.env['DATABASE_URL'];
const googleTransactionSecret =
  'google-oauth-transaction-integration-secret-32-bytes';

const config: AuthenticationConfig = {
  fingerprintSecret: 'google-development-integration-secret-32-bytes',
  allowedOrigins: new Set(['http://localhost:3000']),
  cookieDomain: 'localhost',
  secureCookies: false,
  redirectPath: '/',
  termsVersion: 'v1',
  emailVerificationTtlMs: 600_000,
  emailProvider: 'in-memory',
  resendApiKey: '',
  resendEmailsReadApiKey: '',
  emailFrom: 'Example App <no-reply@localhost.test>',
  authPublicBaseUrl: 'http://localhost:3000',
  emailDiagnosticsEnabled: false,
  emailDiagnosticsSecret: '',
  rabbitMqUrls: [],
  googleEnabled: true,
  googleIssuer: 'https://accounts.google.com',
  googleClientId: 'local-client-id',
  googleClientSecret: 'local-client-secret',
  googleOAuthTransactionSecret: googleTransactionSecret,
  googleAuthorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  googleTokenEndpoint: 'https://oauth2.googleapis.com/token',
  googleJwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  googleRedirectUri: 'http://localhost:3000/auth/google/callback',
};

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  it('BLOCKED AUTH-001 Google local runtime: DATABASE_URL is required', () => {
    expect(databaseUrl).toBeUndefined();
    throw new Error(
      'BLOCKED AUTH-001 Google local runtime: configure DATABASE_URL for PostgreSQL composition coverage',
    );
  });
} else {
  it('persists the Google transaction across runtime restart and consumes it once', async () => {
    const prisma: PrismaClient = createProductionPrismaClient(databaseUrl);
    const firstRuntime = createDevelopmentAuthenticationRuntime(config);
    const stateMarker = randomUUID();
    let transactionState: string | undefined;

    try {
      await firstRuntime.initialize();
      const started = await firstRuntime.startGoogle.execute({
        correlationId: `google-local-${stateMarker}`,
        browserBinding: `browser-${stateMarker}`,
      });
      transactionState = started.state;
      const persisted = await prisma.googleOAuthTransaction.findUnique({
        where: {
          stateHash: new GoogleOAuthTransactionSealer(
            googleTransactionSecret,
          ).stateHash(started.state),
        },
      });

      expect(persisted).not.toBeNull();
      expect(persisted?.stateHash).not.toContain(started.state);
      expect(persisted?.sealedPayload).toBeTruthy();
      expect(persisted?.sealedPayload).not.toContain(started.state);
      expect(persisted?.sealedPayload).not.toContain('code_verifier');
      expect(persisted?.sealedPayload).not.toContain('nonce');

      await firstRuntime.shutdown();
      const restartedRuntime = createDevelopmentAuthenticationRuntime(config);
      await restartedRuntime.initialize();
      const store = new PrismaGoogleTransactionStore(
        prisma,
        googleTransactionSecret,
      );

      try {
        await expect(
          store.consume(started.state, new Date()),
        ).resolves.toMatchObject({
          state: started.state,
          browserBinding: `browser-${stateMarker}`,
          correlationId: `google-local-${stateMarker}`,
        });
        await expect(
          store.consume(started.state, new Date()),
        ).resolves.toBeNull();
      } finally {
        await restartedRuntime.shutdown();
      }
    } finally {
      await firstRuntime.shutdown();
      if (transactionState !== undefined) {
        await prisma.googleOAuthTransaction.deleteMany({
          where: {
            stateHash: new GoogleOAuthTransactionSealer(
              googleTransactionSecret,
            ).stateHash(transactionState),
          },
        });
      }
      await prisma.$disconnect();
    }
  });
}
