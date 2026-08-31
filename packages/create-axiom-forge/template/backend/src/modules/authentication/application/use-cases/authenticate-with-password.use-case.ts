import { AuthenticationError } from '../../domain/errors/authentication.error';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { NormalizedEmail } from '../../domain/value-objects/normalized-email.value-object';
import type { AuthenticateWithPasswordInput } from '../dto/authentication-input.dto';
import type { SessionResult } from '../dto/authentication-result.dto';
import type { PasswordAuthenticationDependencies } from '../ports/authentication-dependencies.port';
import { AuthenticationRateLimitPolicy } from '../policies/rate-limit.policy';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';
import { createAuthenticationSession } from '../handlers/session.handler';

export class AuthenticateWithPasswordUseCase {
  public constructor(
    private readonly dependencies: PasswordAuthenticationDependencies,
  ) {}

  public async execute(
    input: AuthenticateWithPasswordInput,
  ): Promise<SessionResult> {
    const email = NormalizedEmail.from(input.email);
    const emailFingerprint = this.dependencies.fingerprint.email(email.value);
    const rateLimit = new AuthenticationRateLimitPolicy(
      this.dependencies.rateLimit,
    );
    await rateLimit.check(`password:${emailFingerprint}:${input.fingerprint}`);
    const user = await this.dependencies.repository.withTransaction(
      (repository) => repository.findUserByEmail(email.value),
    );
    const passwordHash =
      user?.localCredentialHash ?? this.dependencies.passwordHasher.dummyHash;
    const passwordMatches = await this.dependencies.passwordHasher.verify(
      input.password,
      passwordHash,
    );
    if (
      user == null ||
      !passwordMatches ||
      !UserAggregate.restore(user).canAuthenticate('PASSWORD')
    ) {
      await this.recordFailure(emailFingerprint, input.context.correlationId);
      throw new AuthenticationError('INVALID_CREDENTIAL', 'INVALID_CREDENTIAL');
    }
    return await this.dependencies.repository.withTransaction(
      async (repository) => {
        const session = await createAuthenticationSession({
          repository,
          tokenPort: this.dependencies.tokenPort,
          random: this.dependencies.random,
          clock: this.dependencies.clock,
          userId: user.id,
          authMethod: 'PASSWORD',
          correlationId: input.context.correlationId,
        });
        await appendAuthenticationEvents(
          repository,
          [
            {
              type: 'AuthenticationSucceeded',
              userId: user.id,
              authMethod: 'PASSWORD',
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
          authMethod: 'PASSWORD',
        };
      },
    );
  }

  private async recordFailure(
    emailFingerprint: string,
    correlationId: string,
  ): Promise<void> {
    await this.dependencies.repository.withTransaction((repository) =>
      appendAuthenticationEvents(
        repository,
        [
          {
            type: 'AuthenticationFailed',
            authMethod: 'PASSWORD',
            failureCategory: 'INVALID_CREDENTIAL',
            emailFingerprint,
            occurredAt: this.dependencies.clock.now(),
          },
        ],
        correlationId,
      ),
    );
  }
}
