export interface EmailDeliveryPort {
  sendVerification(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): void | Promise<void>;
  sendMagicLink(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): void | Promise<void>;
}
