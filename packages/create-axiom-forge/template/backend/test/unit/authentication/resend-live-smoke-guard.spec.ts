import { prepareLiveSmoke } from '../../test-kit/resend-live-smoke-guard';

describe('Resend live smoke environment guard', () => {
  it('refuses an opt-in smoke in CI before loading provider configuration', () => {
    const setup = prepareLiveSmoke({
      AUTH_EMAIL_LIVE_TEST: 'true',
      NODE_ENV: 'development',
      CI: 'true',
    });

    expect(setup).toEqual({
      enabled: true,
      error: 'AUTH_EMAIL_LIVE_TEST is not allowed in CI',
    });
  });

  it.each(['test', 'staging', 'production'])(
    'refuses an opt-in smoke outside development (%s) before loading provider configuration',
    (nodeEnv) => {
      const setup = prepareLiveSmoke({
        AUTH_EMAIL_LIVE_TEST: 'true',
        NODE_ENV: nodeEnv,
      });

      expect(setup).toEqual({
        enabled: true,
        error: 'AUTH_EMAIL_LIVE_TEST requires NODE_ENV=development',
      });
    },
  );

  it('does not enable the smoke without the explicit opt-in flag', () => {
    expect(prepareLiveSmoke({ NODE_ENV: 'development' })).toEqual({
      enabled: false,
    });
  });
});
