import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Suspense } from "react";

import { EmailVerificationFallback, EmailVerificationFlow } from "@auth";

export const metadata: Metadata = {
  title: "Verificar e-mail — Starter App",
  description: "Confirme seu endereço de e-mail.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function EmailVerificationPage(): ReactElement {
  return (
    <Suspense fallback={<EmailVerificationFallback />}>
      <EmailVerificationFlow />
    </Suspense>
  );
}
