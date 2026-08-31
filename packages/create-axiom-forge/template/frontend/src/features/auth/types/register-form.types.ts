import type { z } from "zod";

import type { registerFormSchema, registerFormStatusSchema } from "@auth/schemas";
import type { AcceptedResponse, RegisterRequest } from "./auth-api.types";
import type { AuthMutation } from "./auth-mutation.types";

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type RegisterFormStatus = z.infer<typeof registerFormStatusSchema>;

export type RegisterFormController = {
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (value: boolean) => void;
  passwordError: string | undefined;
  confirmError: string | undefined;
  termsError: string | undefined;
  errorMessage: string | undefined;
  status: RegisterFormStatus;
  submit: () => Promise<void>;
  resendCooldown: number;
  resend: () => void;
};

export type RegisterFormOptions = {
  email: string;
  termsVersion: string;
  mutation: AuthMutation<RegisterRequest, AcceptedResponse>;
  onSuccess?: () => void;
};
