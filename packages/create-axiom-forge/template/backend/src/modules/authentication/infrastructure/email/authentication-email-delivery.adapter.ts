import type { EmailDeliveryPort } from '../../application/ports/email-delivery.port';
import type { EmailSenderPort } from '../../application/ports/email-sender.port';
import {
  renderAuthenticationMagicLinkEmail,
  renderAuthenticationVerificationEmail,
} from './templates/auth-email.templates';

export class AuthenticationEmailDeliveryAdapter implements EmailDeliveryPort {
  public constructor(
    private readonly sender: EmailSenderPort,
    private readonly configuration: Readonly<{
      from: string;
      publicBaseUrl: string;
    }>,
  ) {}

  public async sendVerification(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): Promise<void> {
    await this.sender.send(
      renderAuthenticationVerificationEmail({
        ...input,
        from: this.configuration.from,
        publicBaseUrl: this.configuration.publicBaseUrl,
      }),
    );
  }

  public async sendMagicLink(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): Promise<void> {
    await this.sender.send(
      renderAuthenticationMagicLinkEmail({
        ...input,
        from: this.configuration.from,
        publicBaseUrl: this.configuration.publicBaseUrl,
      }),
    );
  }
}
