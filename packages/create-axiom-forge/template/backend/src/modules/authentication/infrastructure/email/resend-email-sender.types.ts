export interface ResendEmailHttpClient {
  sendEmail(
    apiKey: string,
    payload: Readonly<ResendEmailPayload>,
  ): Promise<number>;
}

export interface ResendEmailPayload {
  readonly from: string;
  readonly to: string | ReadonlyArray<string>;
  readonly subject: string;
  readonly text?: string;
  readonly html?: string;
}
