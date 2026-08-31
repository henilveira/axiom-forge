-- Seal transient Google OAuth challenges without destroying the previous format.
-- The old relation is retained intact as a quarantined legacy table. It is not
-- represented in Prisma and the runtime has no read path to it.
--
-- Retention/purge of the legacy plaintext data requires a separate, approved
-- forward-only operation. This migration intentionally has no DELETE, DROP
-- COLUMN, or DROP TABLE. There is no down migration; an emergency application
-- rollback must keep this migration applied and use a separately reviewed
-- forward migration if compatibility with the legacy format is ever required.
ALTER TABLE "auth_google_oauth_transactions"
  RENAME TO "auth_google_oauth_transactions_legacy";

ALTER TABLE "auth_google_oauth_transactions_legacy"
  RENAME CONSTRAINT "auth_google_oauth_transactions_pkey"
  TO "auth_google_oauth_transactions_legacy_pkey";

ALTER INDEX "auth_google_oauth_transactions_expires_at_idx"
  RENAME TO "auth_google_oauth_transactions_legacy_expires_at_idx";

CREATE TABLE "auth_google_oauth_transactions" (
    "state_hash" CHAR(64) NOT NULL,
    "sealed_payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_google_oauth_transactions_pkey" PRIMARY KEY ("state_hash")
);

CREATE INDEX "auth_google_oauth_transactions_expires_at_idx"
  ON "auth_google_oauth_transactions"("expires_at");
