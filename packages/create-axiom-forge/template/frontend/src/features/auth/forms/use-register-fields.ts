"use client";

import { useState } from "react";

export function useRegisterFields(): {
  password: string;
  setPasswordState: (value: string) => void;
  confirmPassword: string;
  setConfirmPasswordState: (value: string) => void;
  termsAccepted: boolean;
  setTermsAcceptedState: (value: boolean) => void;
  passwordError: string | undefined;
  setPasswordError: (value: string | undefined) => void;
  confirmError: string | undefined;
  setConfirmError: (value: string | undefined) => void;
  termsError: string | undefined;
  setTermsError: (value: string | undefined) => void;
} {
  const [password, setPasswordState] = useState("");
  const [confirmPassword, setConfirmPasswordState] = useState("");
  const [termsAccepted, setTermsAcceptedState] = useState(false);
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [termsError, setTermsError] = useState<string>();
  return { password, setPasswordState, confirmPassword, setConfirmPasswordState, termsAccepted, setTermsAcceptedState, passwordError, setPasswordError, confirmError, setConfirmError, termsError, setTermsError };
}
