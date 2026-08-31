import type { AuthenticationRuntime } from '../../application/ports/authentication-runtime.port';

interface AuthenticationRuntimeLifecycle {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export type DevelopmentAuthenticationRuntime = AuthenticationRuntime &
  AuthenticationRuntimeLifecycle;

export type AuthenticationRuntimeWithLifecycle = AuthenticationRuntime &
  Partial<AuthenticationRuntimeLifecycle>;
