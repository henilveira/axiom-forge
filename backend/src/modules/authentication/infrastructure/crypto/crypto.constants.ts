export { SESSION_REFRESH_TTL_MS } from '../../application/policies/session.constants';
const PASSWORD_SALT_BYTES = 16;
export const ACCESS_TOKEN_BYTES = 32;
export const REFRESH_TOKEN_BYTES = 48;
export const FINGERPRINT_LENGTH = 32;
// ponytail: Argon2id cost parameters approved by AUTH-001 decisions
// (memory 64 MiB, 3 iterations, parallelism 1, salt 16 bytes, output 32 bytes).
export const ARGON2ID_PARAMETERS = {
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  saltLength: PASSWORD_SALT_BYTES,
  hashLength: 32,
} as const;
export const ARGON2ID_HASH_PREFIX = '$argon2id$';
// Precomputed valid Argon2id hash of a fixed dummy password, used to keep
// verification timing constant when the credential does not exist.
export const ARGON2ID_DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=1,t=3$0SanJwF2WDCFQ6H3qyFJ8w$fzpog8g2DzwPjjXC1kWKWbHhj88sBsKOdnYfh7rDu1Q';
