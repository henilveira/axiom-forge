import { z } from "zod";

import { emailSchema } from "./email.schema";

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  termsVersion: z.string().trim().min(1),
});

export const passwordLoginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const magicLinkRequestSchema = z.object({ email: emailSchema });

export const googleLinkRequestSchema = z
  .object({
    password: z.string().min(1).optional(),
    magicToken: z.string().min(1).optional(),
  })
  .refine(({ password, magicToken }) => password !== undefined || magicToken !== undefined, {
    message: "Informe uma prova de vínculo",
  });

export const emailVerifyQuerySchema = z.object({ token: z.string().min(1).optional() });
export const magicLinkConsumeQuerySchema = z.object({ token: z.string().min(1) });
export const googleCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const acceptedResponseSchema = z.object({ outcome: z.literal("ACCEPTED") });
export const sessionResponseSchema = z.object({ outcome: z.literal("SUCCESS") });
export const emailVerifyResponseSchema = z.object({ outcome: z.enum(["ACCEPTED", "REJECTED"]) });
export const googleStartResponseSchema = z.object({
  outcome: z.literal("REDIRECT"),
  authorizationUrl: z.url(),
});
export const googleCallbackLinkRequiredResponseSchema = z.object({
  outcome: z.literal("LINK_REQUIRED"),
  linkAttemptId: z.string().min(1),
});
export const googleCallbackResponseSchema = z.union([
  sessionResponseSchema,
  googleCallbackLinkRequiredResponseSchema,
]);

export const authErrorCodeSchema = z.enum([
  "AUTH_FAILED",
  "AUTH_LINKING_REQUIRED",
  "AUTH_CSRF_REJECTED",
  "AUTH_GOOGLE_UNAVAILABLE",
  "AUTH_RATE_LIMITED",
  "AUTH_UNAVAILABLE",
]);

export const authErrorResponseSchema = z.object({ code: authErrorCodeSchema });
