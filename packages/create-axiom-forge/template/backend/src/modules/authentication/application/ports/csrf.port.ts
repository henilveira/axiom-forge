export interface CsrfPort {
  validate(input: {
    readonly origin: string | undefined;
    readonly token: string | undefined;
    readonly cookieToken?: string;
  }): boolean;
}
