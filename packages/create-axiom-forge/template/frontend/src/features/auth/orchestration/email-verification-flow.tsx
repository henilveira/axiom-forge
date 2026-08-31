"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { EMAIL_VERIFICATION_ERROR_MESSAGE } from "@auth/constants";
import { queryEmailVerification } from "@auth/queries";
import { emailVerifyQuerySchema } from "@auth/schemas";
import type { EmailVerificationQuery, EmailVerificationState } from "@auth/types";
import { AuthBackground } from "@auth/components/ui";
import { EmailVerificationPanel } from "@auth/components/states";

import { resolveEmailVerificationState } from "./email-verification";

export function clearVerificationTokenFromBrowserUrl(): void {
  const currentUrl = new URL(globalThis.window.location.href);
  if (!currentUrl.searchParams.has("token")) {
    return;
  }

  currentUrl.searchParams.delete("token");
  globalThis.window.history.replaceState(null, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
}

function EmailVerificationContent({ state }: Readonly<{ state: EmailVerificationState }>): ReactElement {
  return (
    <AuthBackground>
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <EmailVerificationPanel state={state} />
      </div>
    </AuthBackground>
  );
}

export function EmailVerificationFallback(): ReactElement {
  return <EmailVerificationContent state={{ status: "loading" }} />;
}

export function EmailVerificationFlow({
  query = queryEmailVerification,
}: Readonly<{ query?: EmailVerificationQuery }> = {}): ReactElement {
  const searchParams = useSearchParams();
  const parsedQuery = emailVerifyQuerySchema.safeParse({ token: searchParams.get("token") ?? undefined });
  const verificationToken = parsedQuery.success ? parsedQuery.data.token : undefined;
  const [state, setState] = useState<EmailVerificationState>({ status: "loading" });

  useEffect(() => {
    clearVerificationTokenFromBrowserUrl();

    let active = true;

    const resolveState = async (): Promise<void> => {
      const nextState = await resolveEmailVerificationState(query, verificationToken);
      if (active) {
        setState(nextState);
      }
    };

    resolveState().catch(() => {
      if (active) {
        setState({ status: "error", message: EMAIL_VERIFICATION_ERROR_MESSAGE });
      }
    });
    return () => {
      active = false;
    };
  }, [query, verificationToken]);

  return <EmailVerificationContent state={state} />;
}
