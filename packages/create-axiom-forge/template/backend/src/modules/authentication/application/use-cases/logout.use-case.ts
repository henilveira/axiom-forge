import type { DomainClockPort } from '../../domain/ports/domain-clock.port';
import type { RefreshSessionInput } from '../dto/authentication-input.dto';
import type { AuthenticationRepositoryPort } from '../ports/authentication-repository.port';
import type { SessionTokenPort } from '../ports/session-token.port';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';

export class LogoutUseCase {
  public constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenPort: SessionTokenPort,
    private readonly clock: DomainClockPort,
  ) {}

  public async execute(
    input: RefreshSessionInput,
  ): Promise<{ outcome: 'ACCEPTED' }> {
    const now = this.clock.now();
    await this.repository.withTransaction(async (repository) => {
      const session = await repository.findSessionByRefreshHash(
        this.tokenPort.hash(input.refreshToken),
      );
      if (session == null) {
        return;
      }
      await repository.revokeFamily(session.familyId, now);
      await appendAuthenticationEvents(
        repository,
        [
          {
            type: 'SessionRevoked',
            sessionId: session.id,
            reasonCategory: 'LOGOUT',
            occurredAt: now,
          },
        ],
        input.context.correlationId,
      );
    });
    return { outcome: 'ACCEPTED' };
  }
}
