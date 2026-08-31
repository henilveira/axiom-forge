"use client";

import { useCallback, useRef, useState } from "react";

import { loginPasswordSchema } from "@auth/schemas";
import type { AuthMutation, LoginFormStatus, PasswordLoginRequest, SessionResponse } from "@auth/types";
import { getAuthFormErrorMessage } from "./auth-form-error";

export function useLoginForm(options: Readonly<{
  email: string;
  mutation: AuthMutation<PasswordLoginRequest, SessionResponse>;
  onSuccess?: () => void;
}>): {
  password: string;
  setPassword: (value: string) => void;
  passwordError: string | undefined;
  status: LoginFormStatus;
  errorMessage: string | undefined;
  submit: () => Promise<void>;
} {
  const { email, onSuccess } = options;
  const [password, setPasswordState] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<LoginFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const mutation = useRef(options.mutation);

  const setPassword = useCallback((value: string) => {
    setPasswordState(value);
    setPasswordError(undefined);
    setErrorMessage(undefined);
    setStatus("idle");
  }, []);

  const submit = useCallback(async () => {
    const validation = loginPasswordSchema.safeParse({ password });
    if (!validation.success) {
      const validationIssue = validation.error.issues.find((issue) => issue.path[0] === "password");
      if (validationIssue !== undefined) {
        setPasswordError(validationIssue.message);
      }
      return;
    }

    if (mutation.current.getState().status === "pending") {
      return;
    }
    setStatus("pending");
    setErrorMessage(undefined);
    try {
      await mutation.current.execute({ email, password });
      setStatus("success");
      onSuccess?.();
    } catch (error: unknown) {
      setStatus("error");
      setErrorMessage(getAuthFormErrorMessage(error, "Não foi possível entrar. Verifique seus dados e tente novamente."));
    }
  }, [email, onSuccess, password]);

  return {
    password,
    setPassword,
    passwordError,
    status,
    errorMessage,
    submit,
  };
}
