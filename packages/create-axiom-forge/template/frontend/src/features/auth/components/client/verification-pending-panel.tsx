"use client";

import type { ReactElement } from "react";

import { Card, CardContent } from "@shared";
import type { VerificationPendingPanelProps } from "@auth/types";

export function VerificationPendingPanel({
  email,
}: Readonly<VerificationPendingPanelProps>): ReactElement {
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="space-y-4 p-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Verifique seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de verificação para <span className="font-semibold text-foreground">{email}</span>. Abra a
          mensagem e siga o link para ativar sua conta.
        </p>
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          O reenvio do e-mail de verificação não está disponível no momento.
        </p>
      </CardContent>
    </Card>
  );
}
