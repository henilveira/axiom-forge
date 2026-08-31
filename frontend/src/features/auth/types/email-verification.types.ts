import type { EmailVerifyResponse } from "./auth-api.types";

export interface EmailVerificationService {
  verifyEmail(token: string | undefined): Promise<EmailVerifyResponse>;
}

export type EmailVerificationQuery = (token: string | undefined) => Promise<EmailVerifyResponse>;

export type EmailVerificationState =
  | { status: "loading" }
  | { status: "accepted" }
  | { status: "rejected" }
  | { status: "error"; message: string };

export type EmailVerificationPanelProps = {
  state: EmailVerificationState;
};
