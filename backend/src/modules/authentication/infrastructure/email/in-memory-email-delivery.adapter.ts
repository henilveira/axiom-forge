import type { EmailDeliveryPort } from '../../application/ports/email-delivery.port';
import type { DeliveredEmail } from './in-memory-email-delivery.types';

export class InMemoryEmailDeliveryAdapter implements EmailDeliveryPort {
  private readonly messages: DeliveredEmail[] = [];

  public sendVerification(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): void {
    this.messages.push({ kind: 'VERIFICATION', ...input });
  }

  public sendMagicLink(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): void {
    this.messages.push({ kind: 'MAGIC_LINK', ...input });
  }

  public getMessages(): ReadonlyArray<DeliveredEmail> {
    return this.messages.map((message) => ({ ...message }));
  }
}
