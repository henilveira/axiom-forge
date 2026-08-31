import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { AuthenticationError } from '../../domain/errors/authentication.error';
import { NormalizedEmail } from '../../domain/value-objects/normalized-email.value-object';
import type {
  GoogleCallbackInput,
  GoogleCallbackResult,
} from '../dto/google.dto';
import type { SessionResult } from '../dto/authentication-result.dto';
import type { GoogleAuthenticationDependencies } from '../ports/google-dependencies.port';
import type { TransactionalAuthenticationRepository } from '../ports/authentication-repository.port';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';
import { createAuthenticationSession } from '../handlers/session.handler';
import { GOOGLE_LINK_TTL_MS } from './google-link.constants';
import { AuthenticationRateLimitPolicy } from '../policies/rate-limit.policy';
import { PendingGoogleLinkRateLimitPolicy } from '../policies/pending-google-link.policy';

export class HandleGoogleCallbackUseCase {
  public constructor(
    private readonly dependencies: GoogleAuthenticationDependencies,
  ) {}

  public async execute(
    input: GoogleCallbackInput,
  ): Promise<GoogleCallbackResult> {
    try {
      await this.googleRateLimit(input);
      return await this.handle(input);
    } catch (error: unknown) {
      await this.recordFailure(input.context.correlationId);
      throw error;
    }
  }

  private async handle(
    input: GoogleCallbackInput,
  ): Promise<GoogleCallbackResult> {
    if (input.code.length === 0 || input.state.length === 0) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    const transaction = await this.dependencies.transactions.consume(
      input.state,
      this.dependencies.clock.now(),
    );
    if (transaction == null) {
      throw new AuthenticationError('OAUTH_INVALID', 'OAUTH_INVALID');
    }
    const claims = await this.dependencies.google.exchangeAndValidate(
      input.code,
      transaction,
      input.context,
    );
    const email = NormalizedEmail.from(claims.email);
    return await this.dependencies.repository.withTransaction<GoogleCallbackResult>(
      async (repository) => {
        const bySubject = await repository.findUserByExternalIdentity(
          'google',
          claims.subject,
        );
        if (bySubject != null) {
          if (bySubject.status !== 'ACTIVE') {
            throw new AuthenticationError(
              'ACCOUNT_INACTIVE',
              'ACCOUNT_INACTIVE',
            );
          }
          return await this.createSession(repository, bySubject.id, input);
        }
        const byEmail = await repository.findUserByEmail(email.value);
        if (byEmail != null) {
          const linkRateLimit = new PendingGoogleLinkRateLimitPolicy(
            this.dependencies.rateLimit,
          );
          await linkRateLimit.check(byEmail.id);
          const linkAttemptId = this.dependencies.random.id();
          const now = this.dependencies.clock.now();
          await repository.savePendingGoogleLink(
            {
              id: linkAttemptId,
              version: 1,
              userId: byEmail.id,
              subject: claims.subject,
              email: email.value,
              expiresAt: new Date(now.getTime() + GOOGLE_LINK_TTL_MS),
              status: 'ACTIVE',
              consumedAt: null,
              revokedAt: null,
            },
            now,
          );
          return { outcome: 'LINK_REQUIRED', linkAttemptId };
        }
        const user = UserAggregate.registerWithGoogle(
          this.dependencies.random.id(),
          email,
          {
            provider: 'google',
            subject: claims.subject,
            email: email.value,
          },
          this.dependencies.clock.now(),
        );
        await repository.createUser(user.snapshot);
        await appendAuthenticationEvents(
          repository,
          user.pullEvents(),
          input.context.correlationId,
        );
        return await this.createSession(repository, user.snapshot.id, input);
      },
    );
  }

  private async googleRateLimit(input: GoogleCallbackInput): Promise<void> {
    const policy = new AuthenticationRateLimitPolicy(
      this.dependencies.rateLimit,
    );
    await policy.check(
      `google-callback:${input.context.browserBinding ?? 'unknown'}`,
    );
  }

  private async recordFailure(correlationId: string): Promise<void> {
    await this.dependencies.repository.withTransaction((repository) =>
      appendAuthenticationEvents(
        repository,
        [
          {
            type: 'AuthenticationFailed',
            authMethod: 'GOOGLE',
            failureCategory: 'OAUTH_INVALID',
            occurredAt: this.dependencies.clock.now(),
          },
        ],
        correlationId,
      ),
    );
  }

  private async createSession(
    repository: TransactionalAuthenticationRepository,
    userId: string,
    input: GoogleCallbackInput,
  ): Promise<SessionResult> {
    const session = await createAuthenticationSession({
      repository,
      tokenPort: this.dependencies.tokenPort,
      random: this.dependencies.random,
      clock: this.dependencies.clock,
      userId,
      authMethod: 'GOOGLE',
      correlationId: input.context.correlationId,
    });
    await appendAuthenticationEvents(
      repository,
      [
        {
          type: 'AuthenticationSucceeded',
          userId,
          authMethod: 'GOOGLE',
          occurredAt: this.dependencies.clock.now(),
        },
      ],
      input.context.correlationId,
    );
    return {
      outcome: 'SUCCESS',
      session: session.snapshot,
      accessToken: session.tokens.accessToken,
      refreshToken: session.tokens.refreshToken,
      authMethod: 'GOOGLE',
    };
  }
}
