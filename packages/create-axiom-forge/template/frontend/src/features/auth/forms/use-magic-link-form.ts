"use client";

import { useCallback, useRef, useState } from "react";

import type { AcceptedResponse, AuthMutation, LoginFormStatus, MagicLinkRequest } from "@auth/types";
import { getAuthFormErrorMessage } from "./auth-form-error";
import { getMagicLinkValidationError } from "./magic-link-form.helpers";

const FALLBACK_ERROR_MESSAGE = "Não foi possível enviar o link mágico. Tente novamente.";

export function useMagicLinkForm(options: Readonly<{
  email: string;
  mutation: AuthMutation<MagicLinkRequest, AcceptedResponse>;
}>): {
  status: LoginFormStatus;
  errorMessage: string | undefined;
  reset: () => void;
  submit: () => Promise<void>;
} {
  const { email } = options;
  const [status, setStatus] = useState<LoginFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const mutation = useRef(options.mutation);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(undefined);
    mutation.current.reset();
  }, []);

  const submit = useCallback(async () => {
    const validationError = getMagicLinkValidationError(email);
    if (validationError !== undefined) {
      setStatus("error");
      setErrorMessage(validationError);
      return;
    }
    if (status === "pending" || mutation.current.getState().status === "pending") {
      return;
    }

    setStatus("pending");
    setErrorMessage(undefined);
    try {
      await mutation.current.execute({ email });
      setStatus("success");
    } catch (error: unknown) {
      setStatus("error");
      setErrorMessage(getAuthFormErrorMessage(error, FALLBACK_ERROR_MESSAGE));
    }
  }, [email, status]);

  return { status, errorMessage, reset, submit };
}
