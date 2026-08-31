"use client";

import type { ReactElement } from "react";

import { Button, FieldError, Input, Label } from "@shared";
import { GoogleSignInButton } from "@auth/components/client";
import type { LoginEmailStepProps } from "@auth/types";

export function LoginEmailStep({
  email,
  emailError,
  magicLinkErrorMessage,
  magicLinkStatus,
  onEmailChange,
  onMagicLinkClick,
  onGoogleClick,
}: Readonly<LoginEmailStepProps>): ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          E-mail
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(event) => {
            onEmailChange(event.target.value);
          }}
          className={emailError !== undefined ? "border-destructive" : undefined}
          autoFocus
        />
        {emailError !== undefined ? <FieldError>{emailError}</FieldError> : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outlineOnDark"
          className="w-full"
          onClick={onMagicLinkClick}
          disabled={magicLinkStatus === "pending" || magicLinkStatus === "success"}
        >
          {magicLinkStatus === "pending" ? "Enviando link mágico..." : "Receber link mágico"}
        </Button>
        {magicLinkStatus === "success" ? (
          <p className="text-sm text-foreground" role="status" aria-live="polite">
            Se o endereço estiver cadastrado, enviaremos um link mágico para você.
          </p>
        ) : null}
        {magicLinkErrorMessage !== undefined ? <FieldError role="alert">{magicLinkErrorMessage}</FieldError> : null}
      </div>
      <GoogleSignInButton className="w-full" onClick={onGoogleClick} />
    </div>
  );
}
