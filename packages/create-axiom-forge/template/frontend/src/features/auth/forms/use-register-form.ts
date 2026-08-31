"use client";

import { useCallback, useRef, useState } from "react";

import type { RegisterFormController, RegisterFormOptions, RegisterFormStatus } from "@auth/types";
import { getAuthFormErrorMessage } from "./auth-form-error";
import { executeRegisterSubmit, getRegisterValidationErrors } from "./register-form.helpers";
import { useRegisterFields } from "./use-register-fields";

export function useRegisterForm(options: Readonly<RegisterFormOptions>): RegisterFormController {
  const { password, setPasswordState, confirmPassword, setConfirmPasswordState, termsAccepted, setTermsAcceptedState, passwordError, setPasswordError, confirmError, setConfirmError, termsError, setTermsError } = useRegisterFields();
  const [status, setStatus] = useState<RegisterFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const mutation = useRef(options.mutation);
  const setPassword = useCallback((value: string) => {
    setPasswordState(value);
    setPasswordError(undefined);
    setErrorMessage(undefined);
    setStatus("idle");
  }, [setPasswordError, setPasswordState]);
  const setConfirmPassword = useCallback((value: string) => {
    setConfirmPasswordState(value);
    setConfirmError(undefined);
    setErrorMessage(undefined);
    setStatus("idle");
  }, [setConfirmError, setConfirmPasswordState]);
  const setTermsAccepted = useCallback((value: boolean) => {
    setTermsAcceptedState(value);
    setTermsError(undefined);
    setErrorMessage(undefined);
    setStatus("idle");
  }, [setTermsAcceptedState, setTermsError]);
  const submit = useCallback(async () => {
    const errors = getRegisterValidationErrors({ password, confirmPassword, termsAccepted });
    setPasswordError(errors.password);
    setConfirmError(errors.confirmPassword);
    setTermsError(errors.termsAccepted);
    if (errors.password !== undefined || errors.confirmPassword !== undefined || errors.termsAccepted !== undefined) {
      return;
    }

    if (mutation.current.getState().status === "pending") {
      return;
    }
    setStatus("pending");
    try {
      const submitted = await executeRegisterSubmit(mutation.current, { email: options.email, password, termsVersion: options.termsVersion });
      if (!submitted) {
        setStatus("idle");
        return;
      }
      setStatus("success");
      options.onSuccess?.();
    } catch (error: unknown) {
      setStatus("error");
      setErrorMessage(getAuthFormErrorMessage(error, "Não foi possível criar sua conta. Verifique seus dados e tente novamente."));
    }
  }, [password, confirmPassword, setConfirmError, setPasswordError, setTermsError, termsAccepted, options]);
  const resend = useCallback(() => undefined, []);
  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    termsAccepted,
    setTermsAccepted,
    passwordError,
    confirmError,
    termsError,
    errorMessage,
    status,
    submit,
    resendCooldown: 0,
    resend,
  };
}
