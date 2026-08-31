import { AuthenticationError } from '../../domain/errors/authentication.error';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import type { AuthenticationDomainEvent } from '../../domain/events/authentication.event';
import type { ConfirmGoogleLinkInput } from '../dto/google.dto';
import type { SessionResult } from '../dto/authentication-result.dto';
import type { GoogleAuthenticationDependencies } from '../ports/google-dependencies.port';
import type {
  PendingGoogleLink,
  TransactionalAuthenticationRepository,
} from '../ports/authentication-repository.port';
import type { UserSnapshot } from '../../domain/types/authentication.types';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';
import { createAuthenticationSession } from '../handlers/session.handler';
import { AuthenticationRateLimitPolicy } from '../policies/rate-limit.policy';

export class ConfirmGoogleLinkUseCase {
  public constructor(
    private readonly dependencies: GoogleAuthenticationDependencies,
  ) {}

  public async execute(input: ConfirmGoogleLinkInput): Promise<SessionResult> {
    const now = this.dependencies.clock.now();
    return await this.dependencies.repository.withTransaction(
      async (repository) => await this.confirm(repository, input, now),
    );
  }

  private async confirm(
    repository: TransactionalAuthenticationRepository,
    input: ConfirmGoogleLinkInput,
    now: Date,
  ): Promise<SessionResult> {
    const rateLimit = new AuthenticationRateLimitPolicy(
      this.dependencies.rateLimit,
    );
    const pending = await repository.findPendingGoogleLink(input.attemptId);
    this.assertPending(pending, now);
    try {
      await rateLimit.check(
        `google-link:${pending.userId}:${input.context.browserBinding ?? 'unknown'}`,
      );
    } catch (error: unknown) {
      await this.recordFailure(
        repository,
        'RATE_LIMITED',
        now,
        input.context.correlationId,
      );
      throw error;
    }
    const user = await repository.findUserById(pending.userId);
    if (user?.status !== 'ACTIVE') {
      await this.recordFailure(
        repository,
        'ACCOUNT_INACTIVE',
        now,
        input.context.correlationId,
      );
      throw this.linkingError();
    }
    const existingIdentity = await repository.findUserByExternalIdentity(
      'google',
      pending.subject,
    );
    if (existingIdentity != null && existingIdentity.id !== user.id) {
      await this.recordFailure(
        repository,
        'OAUTH_INVALID',
        now,
        input.context.correlationId,
      );
      throw this.linkingError();
    }
    const magicChallengeId = await this.proveOwnership(repository, {
      pending,
      user,
      input,
      now,
      correlationId: input.context.correlationId,
    });
    await this.persistLink(repository, {
      pending,
      user,
      correlationId: input.context.correlationId,
      now,
      magicChallengeId,
    });
    return await this.createSession(
      repository,
      user.id,
      input.context.correlationId,
      now,
    );
  }

  private assertPending(
    pending: PendingGoogleLink | null,
    now: Date,
  ): asserts pending is PendingGoogleLink {
    if (
      pending?.status !== 'ACTIVE' ||
      pending.consumedAt != null ||
      pending.expiresAt.getTime() <= now.getTime()
    ) {
      throw this.linkingError();
    }
  }

  private async proveOwnership(
    repository: TransactionalAuthenticationRepository,
    values: {
      readonly pending: PendingGoogleLink;
      readonly user: UserSnapshot;
      readonly input: ConfirmGoogleLinkInput;
      readonly now: Date;
      readonly correlationId: string;
    },
  ): Promise<string | null> {
    const passwordProved = await this.verifyPassword(
      values.user.localCredentialHash,
      values.input.password,
    );
    if (passwordProved) {
      return null;
    }
    const magicChallengeId = await this.verifyMagic(
      repository,
      values.pending.userId,
      values.input.magicToken,
      values.now,
    );
    if (magicChallengeId == null) {
      await this.recordFailure(
        repository,
        'OAUTH_INVALID',
        values.now,
        values.correlationId,
      );
      throw this.linkingError();
    }
    return magicChallengeId;
  }

  private async persistLink(
    repository: TransactionalAuthenticationRepository,
    values: {
      readonly pending: PendingGoogleLink;
      readonly user: UserSnapshot;
      readonly correlationId: string;
      readonly now: Date;
      readonly magicChallengeId: string | null;
    },
  ): Promise<void> {
    const consumed = await repository.consumePendingGoogleLink(
      values.pending.id,
      values.now,
    );
    if (consumed == null) {
      throw this.linkingError();
    }
    const aggregate = UserAggregate.restore(values.user);
    aggregate.attachGoogleIdentity(
      values.pending.subject,
      values.pending.email,
      values.now,
      this.dependencies.fingerprint.subject(values.pending.subject),
    );
    const updated = await repository.updateUser(
      aggregate.snapshot,
      values.user.status,
    );
    if (!updated) {
      throw this.linkingError();
    }
    await appendAuthenticationEvents(
      repository,
      [...aggregate.pullEvents(), ...magicLinkConsumedEvents(values)],
      values.correlationId,
    );
  }

  private async createSession(
    repository: TransactionalAuthenticationRepository,
    userId: string,
    correlationId: string,
    now: Date,
  ): Promise<SessionResult> {
    const session = await createAuthenticationSession({
      repository,
      tokenPort: this.dependencies.tokenPort,
      random: this.dependencies.random,
      clock: this.dependencies.clock,
      userId,
      authMethod: 'GOOGLE',
      correlationId,
    });
    await appendAuthenticationEvents(
      repository,
      [
        {
          type: 'AuthenticationSucceeded',
          userId,
          authMethod: 'GOOGLE',
          occurredAt: now,
        },
      ],
      correlationId,
    );
    return {
      outcome: 'SUCCESS',
      session: session.snapshot,
      accessToken: session.tokens.accessToken,
      refreshToken: session.tokens.refreshToken,
      authMethod: 'GOOGLE',
    };
  }

  private async verifyPassword(
    passwordHash: string | null,
    password: string | undefined,
  ): Promise<boolean> {
    if (
      passwordHash == null ||
      password === undefined ||
      password.length === 0
    ) {
      return false;
    }
    return await this.dependencies.passwordHasher.verify(
      password,
      passwordHash,
    );
  }

  private async verifyMagic(
    repository: TransactionalAuthenticationRepository,
    userId: string,
    token: string | undefined,
    now: Date,
  ): Promise<string | null> {
    if (token === undefined || token.length === 0) {
      return null;
    }
    const challenge = await repository.consumeChallenge(
      this.dependencies.tokenPort.hash(token),
      'MAGIC_LOGIN',
      now,
      userId,
    );
    return challenge?.userId === userId ? challenge.id : null;
  }

  private linkingError(): AuthenticationError {
    return new AuthenticationError('ACCOUNT_LINKING_REQUIRED', 'OAUTH_INVALID');
  }

  private async recordFailure(
    repository: TransactionalAuthenticationRepository,
    failureCategory: 'ACCOUNT_INACTIVE' | 'OAUTH_INVALID' | 'RATE_LIMITED',
    occurredAt: Date,
    correlationId: string,
  ): Promise<void> {
    await appendAuthenticationEvents(
      repository,
      [
        {
          type: 'AuthenticationFailed',
          authMethod: 'GOOGLE',
          failureCategory,
          occurredAt,
        },
      ],
      correlationId,
    );
  }
}

function magicLinkConsumedEvents(values: {
  readonly user: UserSnapshot;
  readonly now: Date;
  readonly magicChallengeId: string | null;
}): AuthenticationDomainEvent[] {
  if (values.magicChallengeId == null) {
    return [];
  }
  return [
    {
      type: 'MagicLinkConsumed',
      userId: values.user.id,
      challengeId: values.magicChallengeId,
      occurredAt: values.now,
    },
  ];
}
