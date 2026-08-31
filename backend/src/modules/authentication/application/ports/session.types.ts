import type {
  AuthenticationMethod,
  SessionSnapshot,
} from '../../domain/types/authentication.types';
import type { DomainClockPort } from '../../domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../domain/ports/domain-random.port';
import type { TransactionalAuthenticationRepository } from './authentication-repository.port';
import type { SessionTokenPair, SessionTokenPort } from './session-token.port';

export interface CreatedSession {
  readonly snapshot: SessionSnapshot;
  readonly tokens: SessionTokenPair;
}

export interface CreateSessionInput {
  readonly repository: TransactionalAuthenticationRepository;
  readonly tokenPort: SessionTokenPort;
  readonly random: DomainRandomPort;
  readonly clock: DomainClockPort;
  readonly userId: string;
  readonly authMethod: AuthenticationMethod;
  readonly correlationId: string;
  readonly refreshTtlMs?: number;
}
