-- Ephemeral, single-use storage for Google OAuth PKCE/state/nonce transactions.
-- Forward-only: no data migrated from any prior in-memory store.
CREATE TABLE "auth_google_oauth_transactions" (
    "state" VARCHAR(255) NOT NULL,
    "nonce" VARCHAR(255) NOT NULL,
    "code_verifier" VARCHAR(255) NOT NULL,
    "browser_binding" TEXT NOT NULL,
    "correlation_id" VARCHAR(255) NOT NULL,
    "authorization_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_google_oauth_transactions_pkey" PRIMARY KEY ("state")
);

CREATE INDEX "auth_google_oauth_transactions_expires_at_idx"
  ON "auth_google_oauth_transactions"("expires_at");
