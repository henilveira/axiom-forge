import type { DomainRandomPort } from '../../domain/ports/domain-random.port';
import type { CsrfPort } from './csrf.port';
import type { FingerprintPort } from './fingerprint.port';
import type { AuthenticationConfig } from './authentication-config.port';
import type { AuthenticateWithPasswordUseCase } from '../use-cases/authenticate-with-password.use-case';
import type { ConfirmGoogleLinkUseCase } from '../use-cases/confirm-google-link.use-case';
import type { ConsumeMagicLinkUseCase } from '../use-cases/consume-magic-link.use-case';
import type { HandleGoogleCallbackUseCase } from '../use-cases/handle-google-callback.use-case';
import type { LogoutUseCase } from '../use-cases/logout.use-case';
import type { RefreshSessionUseCase } from '../use-cases/refresh-session.use-case';
import type { RegisterWithPasswordUseCase } from '../use-cases/register-with-password.use-case';
import type { RequestMagicLinkUseCase } from '../use-cases/request-magic-link.use-case';
import type { StartGoogleAuthUseCase } from '../use-cases/start-google-auth.use-case';
import type { VerifyEmailUseCase } from '../use-cases/verify-email.use-case';

export const AUTHENTICATION_RUNTIME = Symbol('AUTHENTICATION_RUNTIME');

export interface AuthenticationMessagingRuntime {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface AuthenticationRuntime {
  readonly register: RegisterWithPasswordUseCase;
  readonly verifyEmail: VerifyEmailUseCase;
  readonly login: AuthenticateWithPasswordUseCase;
  readonly requestMagicLink: RequestMagicLinkUseCase;
  readonly consumeMagicLink: ConsumeMagicLinkUseCase;
  readonly refreshSession: RefreshSessionUseCase;
  readonly logout: LogoutUseCase;
  readonly startGoogle: StartGoogleAuthUseCase;
  readonly googleCallback: HandleGoogleCallbackUseCase;
  readonly confirmGoogleLink: ConfirmGoogleLinkUseCase;
  readonly random: DomainRandomPort;
  readonly fingerprint: FingerprintPort;
  readonly csrf: CsrfPort;
  readonly config: AuthenticationConfig;
  readonly messaging?: AuthenticationMessagingRuntime;
}
