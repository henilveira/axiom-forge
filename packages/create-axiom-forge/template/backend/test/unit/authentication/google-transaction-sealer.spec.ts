import { GoogleOAuthTransactionSealer } from '../../../src/modules/authentication/infrastructure/external/google/google-transaction.sealer';
import type { GoogleAuthorizationRequest } from '../../../src/modules/authentication/application/ports/google-oidc.port';

const secret = 'google-oauth-transaction-unit-secret-32-bytes';
const transaction: GoogleAuthorizationRequest = {
  authorizationUrl:
    'https://accounts.google.com/o/oauth2/v2/auth?state=state-unit&nonce=nonce-unit&code_challenge=challenge-unit',
  state: 'state-unit',
  nonce: 'nonce-unit',
  codeVerifier: 'verifier-unit-that-is-long-enough-for-pkce',
  expiresAt: new Date('2026-08-28T12:10:00.000Z'),
  browserBinding: 'browser-unit',
  correlationId: 'correlation-unit',
};

describe('Google OAuth transaction sealing', () => {
  it('seals every OAuth challenge and the authorization URL, then round-trips', () => {
    const sealer = new GoogleOAuthTransactionSealer(secret);
    const sealed = sealer.seal(transaction);

    expect(sealed).not.toContain(transaction.state);
    expect(sealed).not.toContain(transaction.nonce);
    expect(sealed).not.toContain(transaction.codeVerifier);
    expect(sealed).not.toContain('code_challenge');
    expect(sealed).not.toContain(transaction.authorizationUrl);
    expect(
      sealer.open(
        transaction.state,
        sealer.stateHash(transaction.state),
        sealed,
        transaction.expiresAt,
      ),
    ).toEqual(transaction);
  });

  it('rejects tampering and a different configuration secret', () => {
    const sealer = new GoogleOAuthTransactionSealer(secret);
    const sealed = sealer.seal(transaction);
    const tampered = `${sealed.slice(0, -1)}${sealed.endsWith('A') ? 'B' : 'A'}`;

    expect(() =>
      sealer.open(
        transaction.state,
        sealer.stateHash(transaction.state),
        tampered,
        transaction.expiresAt,
      ),
    ).toThrow();

    const otherSealer = new GoogleOAuthTransactionSealer(
      'another-google-oauth-transaction-secret-32-bytes',
    );
    expect(() =>
      otherSealer.open(
        transaction.state,
        otherSealer.stateHash(transaction.state),
        sealed,
        transaction.expiresAt,
      ),
    ).toThrow();
  });

  it('produces a non-reversible lookup key for state', () => {
    const sealer = new GoogleOAuthTransactionSealer(secret);

    expect(sealer.stateHash(transaction.state)).toHaveLength(64);
    expect(sealer.stateHash(transaction.state)).not.toContain(
      transaction.state,
    );
    expect(sealer.stateHash(transaction.state)).not.toBe(
      new GoogleOAuthTransactionSealer(
        'another-google-oauth-transaction-secret-32-bytes',
      ).stateHash(transaction.state),
    );
  });
});
