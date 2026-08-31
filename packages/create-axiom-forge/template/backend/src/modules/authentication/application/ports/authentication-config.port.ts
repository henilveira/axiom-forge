export type AuthenticationEmailProvider = 'in-memory' | 'resend';

export interface AuthenticationConfig {
  readonly fingerprintSecret: string;
  readonly allowedOrigins: ReadonlySet<string>;
  readonly cookieDomain: string;
  readonly secureCookies: boolean;
  readonly redirectPath: string;
  readonly termsVersion: string;
  readonly emailVerificationTtlMs: number;
  readonly emailProvider: AuthenticationEmailProvider;
  readonly resendApiKey: string;
  readonly resendEmailsReadApiKey: string;
  readonly emailFrom: string;
  readonly authPublicBaseUrl: string;
  readonly emailDiagnosticsEnabled: boolean;
  readonly emailDiagnosticsSecret: string;
  readonly rabbitMqUrls: ReadonlyArray<string>;
  readonly googleEnabled: boolean;
  readonly googleIssuer: string;
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly googleOAuthTransactionSecret: string;
  readonly googleAuthorizationEndpoint: string;
  readonly googleTokenEndpoint: string;
  readonly googleJwksUri: string;
  readonly googleRedirectUri: string;
}
