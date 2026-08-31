import { AuthenticationError } from '../../domain/errors/authentication.error';
import type { DomainClockPort } from '../../domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../domain/ports/domain-random.port';
import type { RefreshSessionInput } from '../dto/authentication-input.dto';
import type { SessionResult } from '../dto/authentication-result.dto';
import type {
  AuthenticationRepositoryPort,
  TransactionalAuthenticationRepository,
} from '../ports/authentication-repository.port';
import type { SessionTokenPort } from '../ports/session-token.port';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';

export class RefreshSessionUseCase {
  public constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenPort: SessionTokenPort,
    private readonly random: DomainRandomPort,
    private readonly clock: DomainClockPort,
  ) {}

  public async execute(input: RefreshSessionInput): Promise<SessionResult> {
    const now = this.clock.now();
    const previousHash = this.tokenPort.hash(input.refreshToken);
    return await this.repository.withTransaction(async (repository) => {
      const current = await repository.findSessionByRefreshHash(previousHash);
      if (current == null) {
        throw new AuthenticationError('SESSION_INVALID', 'INVALID_CREDENTIAL');
      }
      if (
        current.status !== 'ACTIVE' ||
        current.refreshExpiresAt.getTime() <= now.getTime()
      ) {
        return await this.rejectReplay(repository, {
          familyId: current.familyId,
          userId: current.userId,
          correlationId: input.context.correlationId,
          now,
        });
      }
      const tokens = this.tokenPort.issue();
      const nextSession = {
        ...current,
        id: this.random.id(),
        accessTokenHash: tokens.accessTokenHash,
        refreshTokenHash: tokens.refreshTokenHash,
        createdAt: now,
        lastRefreshedAt: now,
        revokedAt: null,
        status: 'ACTIVE' as const,
      };
      const result = await repository.rotateSession(
        current.id,
        previousHash,
        nextSession,
        now,
      );
      if (result !== 'ROTATED') {
        return await this.rejectReplay(repository, {
          familyId: current.familyId,
          userId: current.userId,
          correlationId: input.context.correlationId,
          now,
        });
      }
      await appendAuthenticationEvents(
        repository,
        [
          {
            type: 'SessionRefreshed',
            sessionId: nextSession.id,
            familyId: nextSession.familyId,
            occurredAt: now,
          },
        ],
        input.context.correlationId,
      );
      return {
        outcome: 'SUCCESS',
        session: nextSession,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        authMethod: nextSession.authMethod,
      };
    });
  }

  private async rejectReplay(
    repository: TransactionalAuthenticationRepository,
    values: {
      readonly familyId: string;
      readonly userId: string;
      readonly correlationId: string;
      readonly now: Date;
    },
  ): Promise<never> {
    await repository.revokeFamily(values.familyId, values.now);
    await appendAuthenticationEvents(
      repository,
      [
        {
          type: 'SessionFamilyReplayDetected',
          familyId: values.familyId,
          userId: values.userId,
          occurredAt: values.now,
        },
      ],
      values.correlationId,
    );
    throw new AuthenticationError('SESSION_REPLAY', 'INVALID_CREDENTIAL');
  }
}
