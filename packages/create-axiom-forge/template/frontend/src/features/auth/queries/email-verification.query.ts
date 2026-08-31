import { authService } from "@auth/services";
import type { EmailVerificationQuery, EmailVerificationService } from "@auth/types";

export const queryEmailVerification = (
  token: string | undefined,
  service: EmailVerificationService = authService,
): ReturnType<EmailVerificationQuery> => service.verifyEmail(token);
