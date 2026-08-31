import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { AuthenticationError } from '../../domain/errors/authentication.error';
import { NormalizedEmail } from '../../domain/value-objects/normalized-email.value-object';
import type { RegisterWithPasswordInput } from '../dto/authentication-input.dto';
import type { PasswordRegistrationDependencies } from '../ports/authentication-dependencies.port';
import { PasswordPolicy } from '../policies/password.policy';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';
import { scheduleAuthenticationEmailDelivery } from '../handlers/email-delivery.handler';
import { MAGIC_LINK_TOKEN_BYTES } from './magic-link.constants';

function encodeToken(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export class RegisterWithPasswordUseCase {
  private readonly passwordPolicy = new PasswordPolicy();

  public constructor(
    private readonly dependencies: PasswordRegistrationDependencies,
  ) {}

  public async execute(
    input: RegisterWithPasswordInput,
  ): Promise<{ outcome: 'ACCEPTED' }> {
    const email = NormalizedEmail.from(input.email);
    if (
      input.termsVersion.length === 0 ||
      input.termsVersion !== this.dependencies.currentTermsVersion ||
      this.dependencies.emailVerificationTtlMs <= 0
    ) {
      throw new AuthenticationError('INVALID_INPUT', 'INVALID_CREDENTIAL');
    }
    this.passwordPolicy.validate(input.password);
    if (await this.dependencies.passwordBlocklist.contains(input.password)) {
      throw new AuthenticationError('INVALID_INPUT', 'INVALID_CREDENTIAL');
    }
    const emailFingerprint = this.dependencies.fingerprint.email(email.value);
    const passwordHash = await this.dependencies.passwordHasher.hash(
      input.password,
    );
    const token = encodeToken(
      this.dependencies.random.bytes(MAGIC_LINK_TOKEN_BYTES),
    );
    const now = this.dependencies.clock.now();
    const expiresAt = this.dependencies.clock.at(
      this.dependencies.emailVerificationTtlMs,
    );
    const delivery = await this.persistRegistration(input, {
      email,
      emailFingerprint,
      passwordHash,
      token,
      now,
      expiresAt,
    });
    if (delivery != null) {
      scheduleAuthenticationEmailDelivery(
        this.dependencies.repository,
        {
          challengeId: delivery.challengeId,
          category: 'EMAIL_VERIFICATION',
          correlationId: input.context.correlationId,
          recordedAt: this.dependencies.clock.now(),
          send: () =>
            this.dependencies.emailDelivery.sendVerification({
              email: delivery.email,
              token: delivery.token,
              expiresAt: delivery.expiresAt,
            }),
        },
        this.dependencies.logger,
      );
    }
    return { outcome: 'ACCEPTED' };
  }

  private async persistRegistration(
    input: RegisterWithPasswordInput,
    values: {
      readonly email: NormalizedEmail;
      readonly emailFingerprint: string;
      readonly passwordHash: string;
      readonly token: string;
      readonly now: Date;
      readonly expiresAt: Date;
    },
  ): Promise<{
    email: string;
    token: string;
    expiresAt: Date;
    challengeId: string;
  } | null> {
    return await this.dependencies.repository.withTransaction(
      async (repository) => {
        const existing = await repository.findUserByEmail(values.email.value);
        await repository.appendOutbox(
          {
            type: 'UserRegistrationStarted',
            result: existing == null ? 'ACCEPTED' : 'DUPLICATE',
            emailFingerprint: values.emailFingerprint,
            occurredAt: values.now,
          },
          input.context.correlationId,
        );
        if (existing != null) {
          return null;
        }
        const user = UserAggregate.registerWithPassword(
          {
            id: this.dependencies.random.id(),
            passwordHash: values.passwordHash,
            termsVersion: input.termsVersion,
            acceptedAt: values.now,
            occurredAt: values.now,
          },
          values.email,
        );
        await repository.createUser(user.snapshot);
        const challengeId = this.dependencies.random.id();
        await repository.saveChallenge({
          id: challengeId,
          purpose: 'EMAIL_VERIFICATION',
          digest: this.dependencies.tokenPort.hash(values.token),
          userId: user.snapshot.id,
          createdAt: values.now,
          expiresAt: values.expiresAt,
          status: 'ISSUED',
          consumedAt: null,
          stateDigest: null,
          nonceDigest: null,
        });
        await appendAuthenticationEvents(
          repository,
          [
            ...user.pullEvents(),
            {
              type: 'EmailVerificationIssued',
              userId: user.snapshot.id,
              challengeId,
              expiresAt: values.expiresAt,
              occurredAt: values.now,
            },
          ],
          input.context.correlationId,
        );
        return {
          email: values.email.value,
          token: values.token,
          expiresAt: values.expiresAt,
          challengeId,
        };
      },
    );
  }
}
