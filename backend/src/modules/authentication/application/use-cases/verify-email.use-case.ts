import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { AuthenticationError } from '../../domain/errors/authentication.error';
import type { DomainClockPort } from '../../domain/ports/domain-clock.port';
import type { VerifyEmailInput } from '../dto/authentication-input.dto';
import type { AuthenticationRepositoryPort } from '../ports/authentication-repository.port';
import type { SessionTokenPort } from '../ports/session-token.port';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';

export class VerifyEmailUseCase {
  public constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenPort: SessionTokenPort,
    private readonly clock: DomainClockPort,
  ) {}

  public async execute(
    input: VerifyEmailInput,
  ): Promise<{ outcome: 'ACCEPTED' | 'REJECTED' }> {
    const now = this.clock.now();
    const consumed = await this.repository.withTransaction(
      async (repository) => {
        const challenge = await repository.consumeChallenge(
          this.tokenPort.hash(input.token),
          'EMAIL_VERIFICATION',
          now,
        );
        if (challenge?.userId == null) {
          return false;
        }
        const storedUser = await repository.findUserById(challenge.userId);
        if (storedUser == null) {
          return false;
        }
        const user = UserAggregate.restore(storedUser);
        user.verifyEmail(now);
        const updated = await repository.updateUser(
          user.snapshot,
          storedUser.status,
        );
        if (!updated) {
          throw new AuthenticationError('ACCOUNT_INACTIVE', 'ACCOUNT_INACTIVE');
        }
        await appendAuthenticationEvents(
          repository,
          user.pullEvents(),
          input.context.correlationId,
        );
        return true;
      },
    );
    return consumed ? { outcome: 'ACCEPTED' } : { outcome: 'REJECTED' };
  }
}
