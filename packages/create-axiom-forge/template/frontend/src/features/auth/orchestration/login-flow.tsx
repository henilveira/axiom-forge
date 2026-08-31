"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createLoginMutation, createMagicLinkMutation, createRegisterMutation } from "@auth/mutations";
import { AUTH_API_PATHS, AUTH_DEFAULT_REDIRECT_PATH, LOGIN_STEPS, REGISTER_STEPS, TERMS_VERSION } from "@auth/constants";
import { emailSchema } from "@auth/schemas";
import type { LoginFlowStep, LoginFlowStepAction, MultiStepFormStep } from "@auth/types";
import { AuthBackground, MultiStepFormHeader } from "@auth/components/ui";
import { MultiStepFormShell, VerificationPendingPanel } from "@auth/components/client";
import { LoginEmailStep, LoginPasswordStep, RegisterStep } from "@auth/components/forms";
import { useLoginForm, useMagicLinkForm, useRegisterForm } from "@auth/forms";

function navigateToGoogleStart(): void {
  globalThis.window.location.assign(AUTH_API_PATHS.googleStart);
}

function getHeaderSteps(step: LoginFlowStep): MultiStepFormStep[] {
  return step === "register" ? REGISTER_STEPS : LOGIN_STEPS;
}

function getHeaderIndex(step: LoginFlowStep): number {
  return step === "email" ? 0 : 1;
}

function createLoginSuccessHandler(router: ReturnType<typeof useRouter>): () => void {
  return () => {
    router.replace(AUTH_DEFAULT_REDIRECT_PATH);
  };
}

function VerificationPendingStep({
  email,
  resendCooldown,
  onResend,
}: Readonly<{ email: string; resendCooldown: number | undefined; onResend: () => void }>): ReactElement {
  return (
    <AuthBackground>
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <VerificationPendingPanel
          email={email}
          onResend={onResend}
          {...(resendCooldown === undefined ? {} : { resendCooldown })}
        />
      </div>
    </AuthBackground>
  );
}

function getStepAction(
  stepInfo: Readonly<{ step: LoginFlowStep; email: string }>,
  handleEmailContinue: () => void,
  loginForm: Readonly<{ password: string; submit: () => void }>,
  registerForm: Readonly<{ password: string; confirmPassword: string; termsAccepted: boolean; submit: () => void }>,
): LoginFlowStepAction {
  const { step, email } = stepInfo;
  if (step === "email") {
    return { onNext: handleEmailContinue, canNext: email.length > 0, nextLabel: "Continuar" };
  }
  if (step === "register") {
    return {
      onNext: registerForm.submit,
      canNext: registerForm.password.length > 0 && registerForm.confirmPassword.length > 0 && registerForm.termsAccepted,
      nextLabel: "Criar conta",
    };
  }
  return { onNext: loginForm.submit, canNext: loginForm.password.length > 0, nextLabel: "Entrar" };
}

function StepBody({
  step,
  email,
  setEmail,
  emailError,
  setEmailError,
  loginForm,
  magicLinkForm,
  registerForm,
  setStep,
}: Readonly<{
  step: LoginFlowStep;
  email: string;
  setEmail: (value: string) => void;
  emailError: string | undefined;
  setEmailError: (value: string | undefined) => void;
  loginForm: ReturnType<typeof useLoginForm>;
  magicLinkForm: ReturnType<typeof useMagicLinkForm>;
  registerForm: ReturnType<typeof useRegisterForm>;
  setStep: (step: LoginFlowStep) => void;
}>): ReactElement | null {
  if (step === "email") {
    return (
      <LoginEmailStep
        email={email}
        emailError={emailError}
        magicLinkErrorMessage={magicLinkForm.errorMessage}
        magicLinkStatus={magicLinkForm.status}
        onEmailChange={(value) => {
          setEmail(value);
          setEmailError(undefined);
          magicLinkForm.reset();
        }}
        onMagicLinkClick={() => {
          void magicLinkForm.submit().catch(() => undefined);
        }}
        onGoogleClick={navigateToGoogleStart}
      />
    );
  }
  if (step === "login-password") {
    return (
      <LoginPasswordStep
        email={email}
        password={loginForm.password}
        passwordError={loginForm.passwordError}
        errorMessage={loginForm.errorMessage}
        onPasswordChange={loginForm.setPassword}
        onSubmit={loginForm.submit}
        onSwitchToRegister={() => {
          setStep("register");
        }}
      />
    );
  }
  if (step === "register") {
    return (
      <RegisterStep
        email={email}
        password={registerForm.password}
        confirmPassword={registerForm.confirmPassword}
        termsAccepted={registerForm.termsAccepted}
        passwordError={registerForm.passwordError}
        confirmError={registerForm.confirmError}
        termsError={registerForm.termsError}
        {...(registerForm.errorMessage === undefined ? {} : { errorMessage: registerForm.errorMessage })}
        onPasswordChange={registerForm.setPassword}
        onConfirmPasswordChange={registerForm.setConfirmPassword}
        onTermsAcceptedChange={registerForm.setTermsAccepted}
        onSubmit={registerForm.submit}
        onSwitchToLogin={() => {
          setStep("login-password");
        }}
      />
    );
  }
  return null;
}

export function LoginFlow(): ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<LoginFlowStep>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const loginForm = useLoginForm({
    email,
    mutation: createLoginMutation(),
    onSuccess: createLoginSuccessHandler(router),
  });
  const magicLinkForm = useMagicLinkForm({ email, mutation: createMagicLinkMutation() });
  const registerForm = useRegisterForm({
    email,
    termsVersion: TERMS_VERSION,
    mutation: createRegisterMutation(),
    onSuccess: () => {
      setStep("verification-pending");
    },
  });

  const handleEmailContinue = (): void => {
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      const validationIssue = validation.error.issues[0];
      if (validationIssue !== undefined) {
        setEmailError(validationIssue.message);
      }
      return;
    }
    setEmailError(undefined);
    setStep("login-password");
  };

  const handleBack = (): void => {
    if (step === "email") {
      router.push("/");
      return;
    }
    setStep("email");
  };

  if (step === "verification-pending") {
    return <VerificationPendingStep email={email} resendCooldown={registerForm.resendCooldown} onResend={registerForm.resend} />;
  }

  const { onNext, canNext, nextLabel } = getStepAction({ step, email }, handleEmailContinue, loginForm, registerForm);
  const submitting = step === "register" ? registerForm.status === "pending" : loginForm.status === "pending";

  return (
    <AuthBackground>
      <div className="mx-auto max-w-xl px-4 pt-16 sm:px-6">
        <MultiStepFormHeader steps={getHeaderSteps(step)} currentStep={getHeaderIndex(step)} shellTheme="dark" />
      </div>
      <div className="mx-auto max-w-xl px-4 pb-6 pt-10 sm:px-6">
        <MultiStepFormShell
          variant="card"
          shellTheme="dark"
          canNext={canNext}
          nextLabel={nextLabel}
          backLabel="Voltar"
          onNext={onNext}
          onBack={handleBack}
          submitting={submitting}
        >
          <StepBody
            step={step}
            email={email}
            setEmail={setEmail}
            emailError={emailError}
            setEmailError={setEmailError}
            loginForm={loginForm}
            magicLinkForm={magicLinkForm}
            registerForm={registerForm}
            setStep={setStep}
          />
        </MultiStepFormShell>
      </div>
    </AuthBackground>
  );
}
