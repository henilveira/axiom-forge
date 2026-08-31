export interface DeliveredEmail {
  readonly kind: 'VERIFICATION' | 'MAGIC_LINK';
  readonly email: string;
  readonly token: string;
  readonly expiresAt: Date;
}
