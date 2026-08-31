import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { AppModule } from '@';

/**
 * Boots the real, unmocked Nest application (real controllers, filters and
 * middleware pipeline) for HTTP E2E tests. `NODE_ENV=test` makes
 * `AuthenticationModule` select the development composition root
 * (in-memory adapters) — the same intentional behaviour already used by
 * `test/app.e2e-spec.ts`. No real email/Google fixture provider is approved
 * in this environment (see AUTH-BE-T03 handoff in
 * `docs/implementation/AUTH-001-simplified-authentication/backend-fix-status.md`),
 * so flows requiring a verified/ACTIVE session are out of reach for pure
 * HTTP here and are proven at the PostgreSQL persistence layer instead
 * (see `test/integration/authentication/session-lifecycle.integration.spec.ts`).
 */
export async function bootstrapAuthenticationTestApp(): Promise<
  INestApplication<App>
> {
  process.env['AUTH_FINGERPRINT_SECRET'] =
    'test-only-fingerprint-secret-with-enough-length';
  process.env['AUTH_EMAIL_VERIFICATION_TTL_MS'] = '600000';
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
}

export async function shutdownAuthenticationTestApp(
  app: INestApplication<App>,
): Promise<void> {
  await app.close();
  delete process.env['AUTH_FINGERPRINT_SECRET'];
  delete process.env['AUTH_EMAIL_VERIFICATION_TTL_MS'];
}
