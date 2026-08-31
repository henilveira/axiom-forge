export interface SessionTokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenHash: string;
  readonly refreshTokenHash: string;
}

export interface SessionTokenPort {
  issue(): SessionTokenPair;
  hash(token: string): string;
}
