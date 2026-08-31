import {
  Prisma,
  type PrismaClient,
} from '../../../../../generated/prisma/client';
import type {
  GoogleAuthorizationRequest,
  GoogleTransactionStorePort,
} from '../../../application/ports/google-oidc.port';
import type { GoogleOAuthTransactionRow } from './google.types';
import { GoogleOAuthTransactionSealer } from './google-transaction.sealer';

// Durable, single-use store for Google OAuth state/nonce/PKCE verifier.
// The sealing migration quarantines the previous plaintext relation; this
// adapter intentionally targets only the replacement sealed relation.
// ponytail: no periodic cleanup job here — abandoned rows are bounded by TTL
// and never returned by consume(); a retention sweep can be added the same
// way pending-google-link.cleanup.ts does if row volume ever matters.
export class PrismaGoogleTransactionStore implements GoogleTransactionStorePort {
  private readonly sealer: GoogleOAuthTransactionSealer;

  public constructor(client: PrismaClient, secret: string) {
    this.client = client;
    this.sealer = new GoogleOAuthTransactionSealer(secret);
  }

  private readonly client: PrismaClient;

  public async save(transaction: GoogleAuthorizationRequest): Promise<void> {
    await this.client.googleOAuthTransaction.create({
      data: {
        stateHash: this.sealer.stateHash(transaction.state),
        sealedPayload: this.sealer.seal(transaction),
        expiresAt: transaction.expiresAt,
      },
    });
  }

  public async consume(
    state: string,
    now: Date,
  ): Promise<GoogleAuthorizationRequest | null> {
    // Atomic consume-once: DELETE ... RETURNING guarantees only one
    // concurrent caller ever receives the row, with no leftover secret.
    const rows = await this.client.$queryRaw<GoogleOAuthTransactionRow[]>(
      Prisma.sql`
        DELETE FROM "auth_google_oauth_transactions"
        WHERE "state_hash" = ${this.sealer.stateHash(state)}
          AND "expires_at" > ${now}
        RETURNING
          "state_hash" AS "stateHash",
          "sealed_payload" AS "sealedPayload",
          "expires_at" AS "expiresAt"
      `,
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return this.sealer.open(
      state,
      row.stateHash,
      row.sealedPayload,
      row.expiresAt,
    );
  }
}
