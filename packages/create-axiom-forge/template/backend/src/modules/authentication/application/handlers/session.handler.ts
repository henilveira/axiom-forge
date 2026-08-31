import type { SessionSnapshot } from '../../domain/types/authentication.types';
import type {
  CreateSessionInput,
  CreatedSession,
} from '../ports/session.types';
import { appendAuthenticationEvents } from './append-events.handler';
import { AuthenticationError } from '../../domain/errors/authentication.error';

export async function createAuthenticationSession(
  input: CreateSessionInput,
): Promise<CreatedSession> {
  const now = input.clock.now();
  const tokens = input.tokenPort.issue();
  const sessionInput = {
    userId: input.userId,
    authMethod: input.authMethod,
    id: input.random.id(),
    familyId: input.random.id(),
    accessTokenHash: tokens.accessTokenHash,
    refreshTokenHash: tokens.refreshTokenHash,
    createdAt: now,
    refreshExpiresAt: input.clock.at(
      Math.min(
        input.refreshTtlMs ?? input.clock.refreshTtlMs(),
        input.clock.refreshTtlMs(),
      ),
    ),
  };
  const snapshot: SessionSnapshot = {
    ...sessionInput,
    status: 'ACTIVE',
    lastRefreshedAt: null,
    revokedAt: null,
  };
  const created = await input.repository.createSessionForActiveUser(snapshot);
  if (!created) {
    throw new AuthenticationError('ACCOUNT_INACTIVE', 'ACCOUNT_INACTIVE');
  }
  await appendAuthenticationEvents(
    input.repository,
    [
      {
        type: 'SessionStarted',
        sessionId: snapshot.id,
        userId: input.userId,
        authMethod: input.authMethod,
        occurredAt: now,
      },
    ],
    input.correlationId,
  );
  return { snapshot, tokens };
}
