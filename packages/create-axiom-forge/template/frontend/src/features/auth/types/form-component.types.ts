import type { ReactNode } from "react";
import type { z } from "zod";

import type {
  emailSchema,
  loginFormStatusSchema,
  loginPasswordSchema,
  multiStepFormShellThemeSchema,
  multiStepFormStepSchema,
  multiStepFormVariantSchema,
  registerFormSchema,
} from "@auth/schemas";

export type LoginEmailStepData = z.infer<typeof emailSchema>;

export type LoginEmailStepProps = {
  email: LoginEmailStepData;
  emailError: string | undefined;
  magicLinkErrorMessage: string | undefined;
  magicLinkStatus: z.infer<typeof loginFormStatusSchema>;
  onEmailChange: (value: string) => void;
  onMagicLinkClick: () => void;
  onGoogleClick: () => void;
};

export type LoginPasswordStepData = z.infer<typeof loginPasswordSchema>;

export type LoginPasswordStepProps = LoginPasswordStepData & {
  email: string;
  passwordError: string | undefined;
  errorMessage: string | undefined;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onSwitchToRegister: () => void;
};

export type RegisterStepData = z.infer<typeof registerFormSchema>;

export type RegisterStepProps = RegisterStepData & {
  email: string;
  passwordError: string | undefined;
  confirmError: string | undefined;
  termsError: string | undefined;
  errorMessage?: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTermsAcceptedChange: (value: boolean) => void;
  onSubmit: () => Promise<void>;
  onSwitchToLogin: () => void;
};

export type MultiStepFormStep = z.infer<typeof multiStepFormStepSchema>;
export type MultiStepFormShellTheme = z.infer<typeof multiStepFormShellThemeSchema>;
export type MultiStepFormVariant = z.infer<typeof multiStepFormVariantSchema>;

export type MultiStepFormHeaderProps = {
  steps: MultiStepFormStep[];
  currentStep: number;
  headerRight?: ReactNode;
  className?: string;
  shellTheme?: MultiStepFormShellTheme;
};

export type MultiStepFormShellProps = {
  canNext?: boolean;
  nextLabel?: string;
  backLabel?: string;
  onNext: () => void;
  onBack: () => void;
  submitting?: boolean;
  className?: string;
  children: ReactNode;
  variant?: MultiStepFormVariant;
  shellTheme?: MultiStepFormShellTheme;
};

export type GoogleSignInButtonProps = {
  label?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
};

export type VerificationPendingPanelProps = {
  email: string;
  resendCooldown?: number;
  onResend?: () => void;
};
