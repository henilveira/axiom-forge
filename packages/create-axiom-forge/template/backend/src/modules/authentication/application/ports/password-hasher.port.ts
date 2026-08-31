export interface PasswordHasherPort {
  readonly dummyHash: string;
  hash(password: string): string | Promise<string>;
  verify(password: string, encodedHash: string): boolean | Promise<boolean>;
}
