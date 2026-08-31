import type { z } from "zod";

import type {
  acceptedResponseSchema,
  authErrorCodeSchema,
  authErrorResponseSchema,
  emailVerifyResponseSchema,
  emailVerifyQuerySchema,
  googleCallbackLinkRequiredResponseSchema,
  googleCallbackQuerySchema,
  googleCallbackResponseSchema,
  googleLinkRequestSchema,
  googleStartResponseSchema,
  magicLinkConsumeQuerySchema,
  magicLinkRequestSchema,
  passwordLoginRequestSchema,
  registerRequestSchema,
  sessionResponseSchema,
} from "@auth/schemas";

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type PasswordLoginRequest = z.infer<typeof passwordLoginRequestSchema>;
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type GoogleLinkRequest = z.infer<typeof googleLinkRequestSchema>;
export type EmailVerifyQuery = z.infer<typeof emailVerifyQuerySchema>;
export type MagicLinkConsumeQuery = z.infer<typeof magicLinkConsumeQuerySchema>;
export type GoogleCallbackQuery = z.infer<typeof googleCallbackQuerySchema>;
export type AcceptedResponse = z.infer<typeof acceptedResponseSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type EmailVerifyResponse = z.infer<typeof emailVerifyResponseSchema>;
export type GoogleStartResponse = z.infer<typeof googleStartResponseSchema>;
export type GoogleCallbackLinkRequiredResponse = z.infer<typeof googleCallbackLinkRequiredResponseSchema>;
export type GoogleCallbackResponse = z.infer<typeof googleCallbackResponseSchema>;
export type AuthPublicErrorCode = z.infer<typeof authErrorCodeSchema>;
export type AuthErrorResponse = z.infer<typeof authErrorResponseSchema>;

export interface AuthResponseSchema<T> {
  parse(value: unknown): T;
}

export interface AuthRequestOptions {
  expectedStatus: number;
  retryOnCsrfReject: boolean;
}
