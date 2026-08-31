import { magicLinkRequestSchema } from "@auth/schemas";

export function getMagicLinkValidationError(email: string): string | undefined {
  const result = magicLinkRequestSchema.safeParse({ email });
  return result.success ? undefined : result.error.issues[0]?.message;
}
