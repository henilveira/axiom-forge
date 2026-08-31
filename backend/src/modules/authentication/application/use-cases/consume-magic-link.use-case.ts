import { AuthenticationError } from '../../domain/errors/authentication.error';
import type { DomainClockPort } from '../../domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../domain/ports/domain-random.port';
import type { ConsumeMagicLinkInput } from '../dto/authentication-input.dto';
import type { SessionResult } from '../dto/authentication-result.dto';
import type { AuthenticationRepositoryPort } from '../ports/authentication-repository.port';
import type { SessionTokenPort } from '../ports/session-token.port';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';
import { createAuthenticationSession } from '../handlers/session.handler';

export class ConsumeMagicLinkUseCase {
  public constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenPort: SessionTokenPort,
    private readonly random: DomainRandomPort,
    private readonly clock: DomainClockPort,
  ) {}

  public async execute(input: ConsumeMagicLinkInput): Promise<SessionResult> {
    const now = this.clock.now();
    return await this.repository.withTransaction(async (repository) => {
      const challenge = await repository.consumeChallenge(
        this.tokenPort.hash(input.token),
        'MAGIC_LOGIN',
        now,
      );
      if (challenge?.userId == null) {
        throw new AuthenticationError('CHALLENGE_INVALID', 'CHALLENGE_INVALID');
      }
      const user = await repository.findUserById(challenge.userId);
      if (user?.status !== 'ACTIVE' || user.emailVerifiedAt == null) {
        throw new AuthenticationError('CHALLENGE_INVALID', 'CHALLENGE_INVALID');
      }
      const session = await createAuthenticationSession({
        repository,
        tokenPort: this.tokenPort,
        random: this.random,
        clock: this.clock,
        userId: user.id,
        authMethod: 'MAGIC_LINK',
        correlationId: input.context.correlationId,
      });
      await appendAuthenticationEvents(
        repository,
        [
          {
            type: 'MagicLinkConsumed',
            userId: user.id,
            challengeId: challenge.id,
            occurredAt: now,
          },
          {
            type: 'AuthenticationSucceeded',
            userId: user.id,
            authMethod: 'MAGIC_LINK',
            occurredAt: now,
          },
        ],
        input.context.correlationId,
      );
      return {
        outcome: 'SUCCESS',
        session: session.snapshot,
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        authMethod: 'MAGIC_LINK',
      };
    });
  }
}
