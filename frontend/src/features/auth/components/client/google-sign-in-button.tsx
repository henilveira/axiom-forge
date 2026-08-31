"use client";

import type { ReactElement } from "react";

import { Button } from "@shared";
import type { GoogleSignInButtonProps } from "@auth/types";

const DEFAULT_LABEL = "Entrar com Google";

function GoogleIcon(): ReactElement {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 7 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function Spinner(): ReactElement {
  return (
    <span
      className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export function GoogleSignInButton({
  label = DEFAULT_LABEL,
  loading = false,
  onClick,
  className,
}: Readonly<GoogleSignInButtonProps>): ReactElement {
  return (
    <Button type="button" variant="outline" className={className} onClick={onClick} disabled={loading}>
      {loading ? <Spinner /> : <span className="mr-2"><GoogleIcon /></span>}
      {label}
    </Button>
  );
}
