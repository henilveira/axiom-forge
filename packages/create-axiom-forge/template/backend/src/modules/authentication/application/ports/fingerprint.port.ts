export interface FingerprintPort {
  email(email: string): string;
  subject(subject: string): string;
  request(value: string): string;
}
