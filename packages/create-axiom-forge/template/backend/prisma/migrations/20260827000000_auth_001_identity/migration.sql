CREATE TYPE "UserStatus" AS ENUM ('EMAIL_VERIFICATION_PENDING', 'ACTIVE', 'DISABLED');
CREATE TYPE "ChallengePurpose" AS ENUM ('EMAIL_VERIFICATION', 'MAGIC_LOGIN', 'GOOGLE_OAUTH', 'GOOGLE_LINK');
CREATE TYPE "ChallengeStatus" AS ENUM ('ISSUED', 'USED', 'EXPIRED', 'REVOKED');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "AuthenticationMethod" AS ENUM ('PASSWORD', 'GOOGLE', 'MAGIC_LINK');

CREATE TABLE "auth_users" (
  "id" UUID NOT NULL,
  "email_normalized" VARCHAR(320) NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'EMAIL_VERIFICATION_PENDING',
  "email_verified_at" TIMESTAMP(3),
  "terms_version" VARCHAR(128),
  "terms_accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_users_email_normalized_key" ON "auth_users"("email_normalized");

CREATE TABLE "auth_local_credentials" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_local_credentials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_local_credentials_user_id_key" ON "auth_local_credentials"("user_id");

CREATE TABLE "auth_external_identities" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "subject" VARCHAR(512) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_external_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_external_identities_user_id_key" ON "auth_external_identities"("user_id");
CREATE UNIQUE INDEX "auth_external_identities_provider_subject_key" ON "auth_external_identities"("provider", "subject");
CREATE INDEX "auth_external_identities_email_idx" ON "auth_external_identities"("email");

CREATE TABLE "auth_challenges" (
  "id" UUID NOT NULL,
  "purpose" "ChallengePurpose" NOT NULL,
  "digest" CHAR(64) NOT NULL,
  "user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "status" "ChallengeStatus" NOT NULL DEFAULT 'ISSUED',
  "consumed_at" TIMESTAMP(3),
  "state_digest" CHAR(64),
  "nonce_digest" CHAR(64),
  CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_challenges_digest_key" ON "auth_challenges"("digest");
CREATE INDEX "auth_challenges_purpose_status_expires_at_idx" ON "auth_challenges"("purpose", "status", "expires_at");
CREATE INDEX "auth_challenges_user_id_purpose_status_idx" ON "auth_challenges"("user_id", "purpose", "status");

CREATE TABLE "auth_session_families" (
  "id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "auth_session_families_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "auth_method" "AuthenticationMethod" NOT NULL DEFAULT 'PASSWORD',
  "access_token_hash" CHAR(64) NOT NULL,
  "refresh_token_hash" CHAR(64) NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_refreshed_at" TIMESTAMP(3),
  "refresh_expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_sessions_access_token_hash_key" ON "auth_sessions"("access_token_hash");
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");
CREATE INDEX "auth_sessions_family_id_status_idx" ON "auth_sessions"("family_id", "status");
CREATE INDEX "auth_sessions_user_id_status_idx" ON "auth_sessions"("user_id", "status");
CREATE INDEX "auth_sessions_refresh_expires_at_status_idx" ON "auth_sessions"("refresh_expires_at", "status");

CREATE TABLE "auth_pending_google_links" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "subject" VARCHAR(512) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  CONSTRAINT "auth_pending_google_links_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auth_pending_google_links_user_id_expires_at_idx" ON "auth_pending_google_links"("user_id", "expires_at");

CREATE TABLE "auth_outbox_messages" (
  "id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "aggregate_id" UUID,
  "aggregate_version" INTEGER NOT NULL DEFAULT 1,
  "event_type" VARCHAR(160) NOT NULL,
  "event_version" INTEGER NOT NULL DEFAULT 1,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "headers" JSONB NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_until" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "dead_lettered_at" TIMESTAMP(3),
  "last_error_code" VARCHAR(64),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_outbox_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_outbox_messages_event_id_key" ON "auth_outbox_messages"("event_id");
CREATE UNIQUE INDEX "auth_outbox_messages_message_id_key" ON "auth_outbox_messages"("message_id");
CREATE INDEX "auth_outbox_messages_status_available_at_lease_until_idx" ON "auth_outbox_messages"("status", "available_at", "lease_until");

CREATE TABLE "auth_inbox_messages" (
  "id" UUID NOT NULL,
  "consumer_name" VARCHAR(128) NOT NULL,
  "event_id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'IN_FLIGHT',
  "lease_until" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "last_error_code" VARCHAR(64),
  CONSTRAINT "auth_inbox_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_inbox_messages_consumer_name_event_id_key" ON "auth_inbox_messages"("consumer_name", "event_id");
CREATE INDEX "auth_inbox_messages_consumer_name_status_lease_until_idx" ON "auth_inbox_messages"("consumer_name", "status", "lease_until");

ALTER TABLE "auth_local_credentials" ADD CONSTRAINT "auth_local_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_external_identities" ADD CONSTRAINT "auth_external_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "auth_session_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_pending_google_links" ADD CONSTRAINT "auth_pending_google_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
