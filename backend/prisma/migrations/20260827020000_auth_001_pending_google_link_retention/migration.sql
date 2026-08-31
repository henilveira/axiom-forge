-- Retain only the newest active attempt per user before enforcing the invariant.
WITH ranked_active_links AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "user_id"
      ORDER BY "expires_at" DESC, "id" DESC
    ) AS "rank"
  FROM "auth_pending_google_links"
  WHERE "status" = 'ACTIVE'
)
UPDATE "auth_pending_google_links" AS "link"
SET
  "status" = 'REVOKED',
  "revoked_at" = CURRENT_TIMESTAMP,
  "version" = "link"."version" + 1
FROM "ranked_active_links" AS "ranked"
WHERE "link"."id" = "ranked"."id"
  AND "ranked"."rank" > 1;

CREATE UNIQUE INDEX "auth_pending_google_links_one_active_per_user_idx"
  ON "auth_pending_google_links"("user_id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "auth_pending_google_links_status_consumed_at_idx"
  ON "auth_pending_google_links"("status", "consumed_at");

CREATE INDEX "auth_pending_google_links_status_revoked_at_idx"
  ON "auth_pending_google_links"("status", "revoked_at");
