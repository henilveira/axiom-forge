import {
  MIN_GOOGLE_OAUTH_TRANSACTION_SECRET_LENGTH,
  GOOGLE_OAUTH_TRANSACTION_SECRET_ENV,
} from './authentication.constants';
import { requiredConfigText } from './authentication-value.config';

export function readGoogleOAuthTransactionSecret(
  env: NodeJS.ProcessEnv,
  enabled: boolean,
): string {
  if (!enabled) {
    return env[GOOGLE_OAUTH_TRANSACTION_SECRET_ENV]?.trim() ?? '';
  }
  const secret = requiredConfigText(
    env[GOOGLE_OAUTH_TRANSACTION_SECRET_ENV],
    GOOGLE_OAUTH_TRANSACTION_SECRET_ENV,
  );
  if (secret.length < MIN_GOOGLE_OAUTH_TRANSACTION_SECRET_LENGTH) {
    throw new Error(`${GOOGLE_OAUTH_TRANSACTION_SECRET_ENV} is too short`);
  }
  return secret;
}
