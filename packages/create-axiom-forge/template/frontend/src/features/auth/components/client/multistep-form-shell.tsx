"use client";

import type { ReactElement } from "react";

import { Button, cn } from "@shared";
import type { MultiStepFormShellProps } from "@auth/types";

function ShellFooter({
  shellTheme,
  backLabel,
  nextLabel,
  onBack,
  onNext,
  canNext,
  submitting,
}: Readonly<{
  shellTheme: "light" | "dark";
  backLabel: string;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  submitting: boolean;
}>): ReactElement {
  return (
    <footer className="border-t px-6 py-5">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant={shellTheme === "dark" ? "outlineOnDark" : "outline"} onClick={onBack}>
          {backLabel}
        </Button>
        <Button type="button" variant="brand" onClick={onNext} disabled={!canNext || submitting}>
          {submitting ? "Enviando..." : nextLabel}
        </Button>
      </div>
    </footer>
  );
}

export function MultiStepFormShell({
  canNext = true,
  nextLabel = "Continuar",
  backLabel = "Voltar",
  onNext,
  onBack,
  submitting = false,
  className,
  children,
  variant = "card",
  shellTheme = "light",
}: Readonly<MultiStepFormShellProps>): ReactElement {
  const body = <div className="px-6 py-6">{children}</div>;
  const footer = (
    <ShellFooter
      shellTheme={shellTheme}
      backLabel={backLabel}
      nextLabel={nextLabel}
      onBack={onBack}
      onNext={onNext}
      canNext={canNext}
      submitting={submitting}
    />
  );

  if (variant === "plain") {
    return (
      <section className={cn(shellTheme === "dark" && "dark", className)}>
        {body}
        {footer}
      </section>
    );
  }

  return (
    <section className={cn(shellTheme === "dark" && "dark", className)}>
      <div className="rounded-xl border bg-card shadow-soft">
        {body}
        {footer}
      </div>
    </section>
  );
}
