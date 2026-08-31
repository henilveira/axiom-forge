"use client";

import type { ReactElement, SyntheticEvent } from "react";

import { FieldError, Input, Label } from "@shared";
import type { LoginPasswordStepProps } from "@auth/types";

export function submitAuthForm(event: Pick<SyntheticEvent<HTMLFormElement>, "preventDefault">, onSubmit: () => Promise<void>): void {
  event.preventDefault();
  void onSubmit().catch(() => undefined);
}

export function LoginPasswordStep({
  email,
  password,
  passwordError,
  errorMessage,
  onPasswordChange,
  onSubmit,
  onSwitchToRegister,
}: Readonly<LoginPasswordStepProps>): ReactElement {
  return (
    <form
      aria-label="Entrar com senha"
      className="space-y-6"
      onSubmit={(event) => {
        submitAuthForm(event, onSubmit);
      }}
    >
      <div className="rounded-lg border border-accent/20 bg-accent/10 p-4">
        <p className="text-sm text-foreground">
          Bem-vindo de volta, <span className="font-semibold">{email}</span>
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium">
            Senha
          </Label>
          <span className="text-right text-xs text-muted-foreground">Link mágico na etapa anterior</span>
        </div>
        <Input
          id="password"
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
        {errorMessage !== undefined ? <FieldError>{errorMessage}</FieldError> : null}
      </div>
      <button type="submit" className="sr-only" aria-label="Entrar">
        Entrar
      </button>
      <p className="text-sm text-muted-foreground">
        Não tem conta?{" "}
        <button type="button" onClick={onSwitchToRegister} className="font-semibold text-primary hover:underline">
          Cadastre-se
        </button>
      </p>
    </form>
  );
}
