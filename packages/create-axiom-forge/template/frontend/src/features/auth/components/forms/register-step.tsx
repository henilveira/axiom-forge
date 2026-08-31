"use client";

import type { ChangeEvent, ReactElement, SyntheticEvent } from "react";

import { FieldError, Input, Label } from "@shared";
import type { RegisterStepProps } from "@auth/types";

export function submitRegisterForm(event: Pick<SyntheticEvent<HTMLFormElement>, "preventDefault">, onSubmit: () => Promise<void>): void {
  event.preventDefault();
  void onSubmit().catch(() => undefined);
}

function TermsField({
  termsAccepted,
  termsError,
  onTermsAcceptedChange,
}: Readonly<Pick<RegisterStepProps, "termsAccepted" | "termsError" | "onTermsAcceptedChange">>): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onTermsAcceptedChange(event.target.checked);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-1" checked={termsAccepted} onChange={handleChange} />
        <span>
          Li e aceito os{" "}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Política de Privacidade
          </a>
        </span>
      </label>
      {termsError !== undefined ? <FieldError>{termsError}</FieldError> : null}
    </div>
  );
}

export function RegisterStep({
  email,
  password,
  confirmPassword,
  termsAccepted,
  passwordError,
  confirmError,
  termsError,
  errorMessage,
  onPasswordChange,
  onConfirmPasswordChange,
  onTermsAcceptedChange,
  onSubmit,
  onSwitchToLogin,
}: Readonly<RegisterStepProps>): ReactElement {
  return (
    <form
      aria-label="Criar conta"
      className="space-y-6"
      onSubmit={(event) => {
        submitRegisterForm(event, onSubmit);
      }}
    >
      <div className="rounded-lg border border-brand/20 bg-brand/10 p-4">
        <p className="text-sm text-foreground">
          Criando conta para <span className="font-semibold">{email}</span>
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-sm font-medium">
          Criar senha
        </Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => {
            onPasswordChange(event.target.value);
          }}
          className={passwordError !== undefined ? "border-destructive" : undefined}
          autoFocus
        />
        {passwordError !== undefined ? <FieldError>{passwordError}</FieldError> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-sm font-medium">
          Confirmar senha
        </Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => {
            onConfirmPasswordChange(event.target.value);
          }}
          className={confirmError !== undefined ? "border-destructive" : undefined}
        />
        {confirmError !== undefined ? <FieldError>{confirmError}</FieldError> : null}
      </div>
      <TermsField termsAccepted={termsAccepted} termsError={termsError} onTermsAcceptedChange={onTermsAcceptedChange} />
      {errorMessage !== undefined ? <FieldError role="alert">{errorMessage}</FieldError> : null}
      <button type="submit" className="sr-only" aria-label="Criar conta">
        Criar conta
      </button>
      <p className="text-sm text-muted-foreground">
        Já tem conta?{" "}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-primary hover:underline">
          Entrar
        </button>
      </p>
    </form>
  );
}
