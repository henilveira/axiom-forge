import { describe, expect, test } from "vitest";

import { AUTH_API_PATHS, AUTH_DEFAULT_REDIRECT_PATH, AUTH_HEADER_NAMES } from "@auth/constants";
import {
  acceptedResponseSchema,
  authErrorResponseSchema,
  emailSchema,
  emailVerifyQuerySchema,
  googleLinkRequestSchema,
  googleCallbackQuerySchema,
  googleCallbackResponseSchema,
  googleStartResponseSchema,
  loginPasswordSchema,
  magicLinkConsumeQuerySchema,
  magicLinkRequestSchema,
  passwordLoginRequestSchema,
  registerFormSchema,
  registerRequestSchema,
} from "@auth/schemas";

function hasIssueForField(issues: readonly { path: PropertyKey[] }[], field: string): boolean {
  return issues.some((issue) => issue.path[0] === field);
}

describe("auth schemas", () => {
  test("normalizes and accepts a valid e-mail", () => {
    const result = emailSchema.safeParse("  ana@example.com  ");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("ana@example.com");
    }
  });

  test("rejects malformed e-mail input", () => {
    const result = emailSchema.safeParse("ana.example.com");

    expect(result.success).toBe(false);
  });

  test("requires a password for login", () => {
    const result = loginPasswordSchema.safeParse({ password: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Informe sua senha");
    }
  });

  test("accepts a complete registration form", () => {
    const result = registerFormSchema.safeParse({
      password: "Example-Password/2026!",
      confirmPassword: "Example-Password/2026!",
      termsAccepted: true,
    });

    expect(result.success).toBe(true);
  });

  test("reports registration issues on their fields", () => {
    const result = registerFormSchema.safeParse({
      password: "short",
      confirmPassword: "different",
      termsAccepted: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(hasIssueForField(result.error.issues, "password")).toBe(true);
      expect(hasIssueForField(result.error.issues, "confirmPassword")).toBe(true);
      expect(hasIssueForField(result.error.issues, "termsAccepted")).toBe(true);
    }
  });

  test("parses API requests with normalized e-mail and terms version", () => {
    const result = registerRequestSchema.safeParse({
      email: " ana@example.com ",
      password: "Example-Password/2026!",
      termsVersion: " v1 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        email: "ana@example.com",
        password: "Example-Password/2026!",
        termsVersion: "v1",
      });
    }
  });

  test("requires both credentials for password login", () => {
    expect(passwordLoginRequestSchema.safeParse({ email: "ana@example.com", password: "" }).success).toBe(false);
  });

  test("accepts only a non-empty proof for Google linking", () => {
    expect(googleLinkRequestSchema.safeParse({}).success).toBe(false);
    expect(googleLinkRequestSchema.safeParse({ password: "Example-Password/2026!" }).success).toBe(true);
    expect(googleLinkRequestSchema.safeParse({ magicToken: "token" }).success).toBe(true);
    expect(googleLinkRequestSchema.safeParse({ password: "", magicToken: "" }).success).toBe(false);
  });

  test("parses public response and error envelopes only", () => {
    expect(acceptedResponseSchema.safeParse({ outcome: "ACCEPTED" }).success).toBe(true);
    expect(
      googleStartResponseSchema.safeParse({
        outcome: "REDIRECT",
        authorizationUrl: "https://accounts.google.com/",
      }).success,
    ).toBe(true);
    expect(authErrorResponseSchema.safeParse({ code: "AUTH_CSRF_REJECTED" }).success).toBe(true);
    expect(authErrorResponseSchema.safeParse({ code: "internal-detail" }).success).toBe(false);
  });

  test("keeps magic request as a separate API contract", () => {
    expect(magicLinkRequestSchema.safeParse({ email: "ana@example.com" }).success).toBe(true);
    expect(magicLinkRequestSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  test("parses navigation queries without transforming opaque values", () => {
    const emailQuery = emailVerifyQuerySchema.safeParse({ token: " verification-token " });
    const magicQuery = magicLinkConsumeQuerySchema.safeParse({ token: "magic-token" });
    const googleQuery = googleCallbackQuerySchema.safeParse({ code: "code", state: "state" });

    expect(emailQuery.success).toBe(true);
    if (emailQuery.success) expect(emailQuery.data.token).toBe(" verification-token ");
    expect(magicQuery.success).toBe(true);
    expect(googleQuery.success).toBe(true);
    expect(googleCallbackQuerySchema.safeParse({ code: "code" }).success).toBe(false);
    expect(magicLinkConsumeQuerySchema.safeParse({ token: "" }).success).toBe(false);
  });

  test("represents the observable Google callback body, including the declared gap", () => {
    expect(googleCallbackResponseSchema.safeParse({ outcome: "SUCCESS" }).success).toBe(true);
    expect(
      googleCallbackResponseSchema.safeParse({ outcome: "LINK_REQUIRED", linkAttemptId: "attempt-1" }).success,
    ).toBe(true);
    expect(googleCallbackResponseSchema.safeParse({ outcome: "LINK_REQUIRED" }).success).toBe(false);
  });

  test("keeps API paths and transport header names typed and contract-compatible", () => {
    expect(AUTH_API_PATHS.googleCallback).toBe("/auth/google/callback");
    expect(AUTH_API_PATHS.magicLinkConsume).toBe("/auth/magic-link/consume");
    expect(AUTH_HEADER_NAMES.csrfToken).toBe("x-csrf-token");
    expect(AUTH_HEADER_NAMES.correlationId).toBe("x-correlation-id");
    expect(AUTH_DEFAULT_REDIRECT_PATH).toBe("/");
  });
});
