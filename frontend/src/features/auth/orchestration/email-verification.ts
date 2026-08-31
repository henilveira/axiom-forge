import { EMAIL_VERIFICATION_ERROR_MESSAGE } from "@auth/constants";
import { getAuthFormErrorMessage } from "@auth/forms";
import type { EmailVerificationQuery, EmailVerificationState } from "@auth/types";

export async function resolveEmailVerificationState(
  query: EmailVerificationQuery,
  token?: string,
): Promise<EmailVerificationState> {
  try {
    const response = await query(token);
    return response.outcome === "ACCEPTED" ? { status: "accepted" } : { status: "rejected" };
  } catch (error: unknown) {
    return {
      status: "error",
      message: getAuthFormErrorMessage(error, EMAIL_VERIFICATION_ERROR_MESSAGE),
    };
  }
}
