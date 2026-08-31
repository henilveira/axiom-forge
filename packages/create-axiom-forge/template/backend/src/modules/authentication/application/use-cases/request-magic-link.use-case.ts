import { NormalizedEmail } from '../../domain/value-objects/normalized-email.value-object';
import type { RequestMagicLinkInput } from '../dto/authentication-input.dto';
import type { MagicLinkDependencies } from '../ports/authentication-dependencies.port';
import { appendAuthenticationEvents } from '../handlers/append-events.handler';
import { scheduleAuthenticationEmailDelivery } from '../handlers/email-delivery.handler';
import { AuthenticationRateLimitPolicy } from '../policies/rate-limit.policy';
import {
  MAGIC_LINK_TOKEN_BYTES,
  MAGIC_LINK_TTL_MS,
} from './magic-link.constants';

function encodeToken(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export class RequestMagicLinkUseCase {
  public constructor(private readonly dependencies: MagicLinkDependencies) {}

  public async execute(
    input: RequestMagicLinkInput,
  ): Promise<{ outcome: 'ACCEPTED' }> {
    const email = NormalizedEmail.from(input.email);
    const emailFingerprint = this.dependencies.fingerprint.email(email.value);
    const rateLimit = new AuthenticationRateLimitPolicy(
      this.dependencies.rateLimit,
    );
    await rateLimit.check(`magic:${emailFingerprint}:${input.fingerprint}`);
    const token = encodeToken(
      this.dependencies.random.bytes(MAGIC_LINK_TOKEN_BYTES),
    );
    const now = this.dependencies.clock.now();
    const expiresAt = this.dependencies.clock.at(MAGIC_LINK_TTL_MS);
    const delivery = await this.dependencies.repository.withTransaction(
      async (repository) => {
        const user = await repository.findUserByEmail(email.value);
        if (user?.status !== 'ACTIVE' || user.emailVerifiedAt == null) {
          return null;
        }
        const challengeId = this.dependencies.random.id();
        await repository.saveChallenge({
          id: challengeId,
          purpose: 'MAGIC_LOGIN',
          digest: this.dependencies.tokenPort.hash(token),
          userId: user.id,
          createdAt: now,
          expiresAt,
          status: 'ISSUED',
          consumedAt: null,
          stateDigest: null,
          nonceDigest: null,
        });
        await appendAuthenticationEvents(
          repository,
          [
            {
              type: 'MagicLinkIssued',
              challengeId,
              expiresAt,
              emailFingerprint,
              occurredAt: now,
            },
          ],
          input.context.correlationId,
        );
        return { email: email.value, token, expiresAt, challengeId };
      },
    );
    if (delivery != null) {
      scheduleAuthenticationEmailDelivery(
        this.dependencies.repository,
        {
          challengeId: delivery.challengeId,
          category: 'MAGIC_LOGIN',
          correlationId: input.context.correlationId,
          recordedAt: this.dependencies.clock.now(),
          send: () =>
            this.dependencies.emailDelivery.sendMagicLink({
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
}
