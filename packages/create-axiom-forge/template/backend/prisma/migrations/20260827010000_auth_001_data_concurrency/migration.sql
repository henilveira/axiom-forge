CREATE TYPE "PendingGoogleLinkStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'REVOKED', 'EXPIRED');

ALTER TABLE "auth_users"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "auth_pending_google_links"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "status" "PendingGoogleLinkStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "revoked_at" TIMESTAMP(3);

UPDATE "auth_pending_google_links"
SET "status" = 'CONSUMED'
WHERE "consumed_at" IS NOT NULL;

UPDATE "auth_pending_google_links"
SET "status" = 'EXPIRED'
WHERE "consumed_at" IS NULL
  AND "expires_at" <= CURRENT_TIMESTAMP;

ALTER TABLE "auth_outbox_messages"
  ADD COLUMN "lease_owner" VARCHAR(128),
  ADD COLUMN "lease_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "auth_inbox_messages"
  ADD COLUMN "lease_owner" VARCHAR(128),
  ADD COLUMN "lease_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "auth_users"
  ADD CONSTRAINT "auth_users_version_positive" CHECK ("version" > 0);
ALTER TABLE "auth_pending_google_links"
  ADD CONSTRAINT "auth_pending_google_links_version_positive" CHECK ("version" > 0);
ALTER TABLE "auth_outbox_messages"
  ADD CONSTRAINT "auth_outbox_messages_lease_version_nonnegative" CHECK ("lease_version" >= 0);
ALTER TABLE "auth_inbox_messages"
  ADD CONSTRAINT "auth_inbox_messages_lease_version_nonnegative" CHECK ("lease_version" >= 0);

CREATE INDEX "auth_pending_google_links_status_expires_at_idx"
  ON "auth_pending_google_links"("status", "expires_at");
