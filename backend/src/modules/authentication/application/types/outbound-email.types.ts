export interface OutboundEmail {
  readonly to: string | ReadonlyArray<string>;
  readonly from: string;
  readonly subject: string;
  readonly text?: string;
  readonly html?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}
