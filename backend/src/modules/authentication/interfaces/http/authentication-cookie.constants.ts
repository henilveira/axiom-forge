export const ACCESS_COOKIE_NAME = 'app_session';
export const REFRESH_COOKIE_NAME = 'app_refresh';
export const CSRF_COOKIE_NAME = 'app_csrf';
export const OAUTH_STATE_COOKIE_NAME = 'app_oauth_state';
export const GOOGLE_LINK_COOKIE_NAME = 'app_google_link';
export {
  SESSION_ACCESS_TTL_MS as ACCESS_COOKIE_MAX_AGE_MS,
  SESSION_REFRESH_TTL_MS as REFRESH_COOKIE_MAX_AGE_MS,
} from '../../application/policies/session.constants';
export { AUTHENTICATION_CHALLENGE_COOKIE_MAX_AGE_MS as CHALLENGE_COOKIE_MAX_AGE_MS } from '../../application/policies/authentication-ttl.constants';
