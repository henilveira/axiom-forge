import type { EmailSenderPort } from '../../src/modules/authentication/application/ports/email-sender.port';
import type { OutboundEmail } from '../../src/modules/authentication/application/types/outbound-email.types';

/** Captures rendered messages without retaining a provider client or making network calls. */
export class CapturingEmailSender implements EmailSenderPort {
  public readonly messages: OutboundEmail[] = [];

  public send(message: OutboundEmail): void {
    this.messages.push(message);
  }
}
