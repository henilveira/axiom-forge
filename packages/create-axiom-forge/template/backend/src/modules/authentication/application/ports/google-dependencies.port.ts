import type { CoreAuthenticationDependencies } from './authentication-dependencies.port';
import type { PasswordHasherPort } from './password-hasher.port';
import type { RateLimitPort } from './rate-limit.port';
import type {
  GoogleOidcPort,
  GoogleTransactionStorePort,
} from './google-oidc.port';

export interface GoogleAuthenticationDependencies extends CoreAuthenticationDependencies {
  readonly google: GoogleOidcPort;
  readonly transactions: GoogleTransactionStorePort;
  readonly passwordHasher: PasswordHasherPort;
  readonly rateLimit: RateLimitPort;
}
