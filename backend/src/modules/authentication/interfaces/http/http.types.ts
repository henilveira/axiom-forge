export interface HttpRequestLike {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly cookies?: Readonly<Record<string, string | undefined>>;
  readonly ip?: string;
}

interface HttpCookieOptions {
  readonly httpOnly?: boolean;
  readonly secure?: boolean;
  readonly sameSite?: 'lax' | 'strict' | 'none';
  readonly path?: string;
  readonly domain?: string;
  readonly maxAge?: number;
}

export interface HttpResponseLike {
  cookie(name: string, value: string, options: HttpCookieOptions): void;
  clearCookie(name: string, options: HttpCookieOptions): void;
  setHeader(name: string, value: string): void;
  redirect(status: number, url: string): void;
  status(status: number): HttpResponseLike;
  json(body: unknown): void;
}
