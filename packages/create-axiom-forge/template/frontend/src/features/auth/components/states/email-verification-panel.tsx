import type { ReactElement } from "react";

import { AUTH_LOGIN_PATH } from "@auth/constants";
import type { EmailVerificationPanelProps } from "@auth/types";
import { Card, CardContent } from "@shared";

function StatusMessage({ state }: EmailVerificationPanelProps): ReactElement {
  if (state.status === "loading") {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verificando seu e-mail</h1>
        <p className="text-sm text-muted-foreground">Aguarde enquanto confirmamos seu endereço.</p>
      </div>
    );
  }

  if (state.status === "accepted") {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">E-mail verificado</h1>
        <p className="text-sm text-muted-foreground">Seu e-mail foi confirmado com sucesso.</p>
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={AUTH_LOGIN_PATH}>
          Ir para o login
        </a>
      </div>
    );
  }

  if (state.status === "rejected") {
    return (
      <div role="alert" aria-live="assertive" className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Não foi possível verificar seu e-mail</h1>
        <p className="text-sm text-muted-foreground">O link é inválido, expirou ou já foi utilizado.</p>
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={AUTH_LOGIN_PATH}>
          Voltar para o login
        </a>
      </div>
    );
  }

  return (
    <div role="alert" aria-live="assertive" className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Não foi possível verificar seu e-mail</h1>
      <p className="text-sm text-muted-foreground">{state.message}</p>
      <a className="font-medium text-primary underline-offset-4 hover:underline" href={AUTH_LOGIN_PATH}>
        Voltar para o login
      </a>
    </div>
  );
}

export function EmailVerificationPanel({ state }: Readonly<EmailVerificationPanelProps>): ReactElement {
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="p-8 text-center">
        <StatusMessage state={state} />
      </CardContent>
    </Card>
  );
}
