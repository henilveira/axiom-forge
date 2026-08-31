import type { EmailSenderPort } from '../../../src/modules/authentication/application/ports/email-sender.port';
import type { OutboundEmail } from '../../../src/modules/authentication/application/types/outbound-email.types';
import { AuthenticationEmailDeliveryAdapter } from '../../../src/modules/authentication/infrastructure/email/authentication-email-delivery.adapter';

describe('authentication e-mail delivery contract', () => {
  it('bridges verification and magic-link delivery to the generic sender', async () => {
    const sent: OutboundEmail[] = [];
    const sender: EmailSenderPort = {
      send: (email) => {
        sent.push(email);
        return Promise.resolve();
      },
    };
    const delivery = new AuthenticationEmailDeliveryAdapter(sender, {
      from: 'Example App <no-reply@example.com>',
      publicBaseUrl: 'https://api.example.com',
    });
    const expiresAt = new Date('2026-08-28T12:00:00.000Z');

    await delivery.sendVerification({
      email: 'person@example.com',
      token: 'verification-token',
      expiresAt,
    });
    await delivery.sendMagicLink({
      email: 'person@example.com',
      token: 'magic-token',
      expiresAt,
    });

    expect(sent).toHaveLength(2);
    expect(sent[0]?.metadata).toEqual({ category: 'EMAIL_VERIFICATION' });
    expect(sent[0]?.text).toContain(
      'https://api.example.com/auth/email/verify?token=verification-token',
    );
    expect(sent[1]?.metadata).toEqual({ category: 'MAGIC_LOGIN' });
    expect(sent[1]?.text).toContain(
      'https://api.example.com/auth/magic-link/consume?token=magic-token',
    );
  });
});
