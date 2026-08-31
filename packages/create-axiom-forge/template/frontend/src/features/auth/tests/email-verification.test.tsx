import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EmailVerificationPanel } from "@auth/components/states";
import { clearVerificationTokenFromBrowserUrl, EmailVerificationFallback, resolveEmailVerificationState } from "@auth/orchestration";
import { AuthServiceError } from "@auth/services";
import type { EmailVerificationService } from "@auth/types";

const verificationToken = "opaque-verification-token";
const serviceUnavailableStatus = 503;
const verificationPageSource = readFileSync(new URL("../../../app/email/verify/page.tsx", import.meta.url), "utf8");

function createService(): EmailVerificationService & { verifyEmail: ReturnType<typeof vi.fn> } {
  const verifyEmail = vi.fn<EmailVerificationService["verifyEmail"]>();
  return { verifyEmail };
}

describe("email verification orchestration", () => {
  it("removes the opaque token from the browser URL before verification is requested", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "https://application.test/email/verify?token=opaque-verification-token&source=email#result" },
      history: { replaceState },
    });

    try {
      clearVerificationTokenFromBrowserUrl();
    } finally {
      vi.unstubAllGlobals();
    }

    expect(replaceState).toHaveBeenCalledOnce();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/email/verify?source=email#result");
    expect(replaceState.mock.calls[0]?.[2]).not.toContain(verificationToken);
  });

  it("maps the accepted backend JSON outcome without returning the token", async () => {
    const service = createService();
    service.verifyEmail.mockResolvedValue({ outcome: "ACCEPTED" });
    const query = service.verifyEmail.bind(service);

    await expect(resolveEmailVerificationState(query, verificationToken)).resolves.toEqual({ status: "accepted" });
    expect(service.verifyEmail.mock.calls).toContainEqual([verificationToken]);
  });

  it("maps the rejected backend JSON outcome", async () => {
    const service = createService();
    service.verifyEmail.mockResolvedValue({ outcome: "REJECTED" });
    const query = service.verifyEmail.bind(service);

    await expect(resolveEmailVerificationState(query, undefined)).resolves.toEqual({ status: "rejected" });
    expect(service.verifyEmail.mock.calls).toContainEqual([undefined]);
  });

  it("maps service failures to a safe user-facing error state", async () => {
    const service = createService();
    service.verifyEmail.mockRejectedValue(new AuthServiceError(serviceUnavailableStatus, "AUTH_UNAVAILABLE"));
    const query = service.verifyEmail.bind(service);

    await expect(resolveEmailVerificationState(query, verificationToken)).resolves.toEqual({
      status: "error",
      message: "O serviço está indisponível no momento. Tente novamente.",
    });
  });

  it("keeps the RSC page boundary and initial fallback free of the verification token", () => {
    const initialMarkup = renderToStaticMarkup(<EmailVerificationFallback />);

    expect(verificationPageSource).not.toContain("searchParams");
    expect(verificationPageSource).not.toContain("token");
    expect(verificationPageSource).toContain('export const dynamic = "force-dynamic";');
    expect(verificationPageSource).toContain("export const revalidate = 0;");
    expect(verificationPageSource).toContain('export const fetchCache = "force-no-store";');
    expect(initialMarkup).not.toContain(verificationToken);
  });
});

describe("email verification states", () => {
  it("renders an accessible loading state", () => {
    const markup = renderToStaticMarkup(<EmailVerificationPanel state={{ status: "loading" }} />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Verificando seu e-mail");
  });

  it("renders accepted and rejected states without rendering the opaque token", () => {
    const acceptedMarkup = renderToStaticMarkup(<EmailVerificationPanel state={{ status: "accepted" }} />);
    const rejectedMarkup = renderToStaticMarkup(<EmailVerificationPanel state={{ status: "rejected" }} />);
    const errorMarkup = renderToStaticMarkup(
      <EmailVerificationPanel state={{ status: "error", message: "Tente novamente." }} />,
    );

    expect(acceptedMarkup).toContain("E-mail verificado");
    expect(rejectedMarkup).toContain("O link é inválido, expirou ou já foi utilizado.");
    expect(errorMarkup).toContain('role="alert"');
    expect(`${acceptedMarkup}${rejectedMarkup}${errorMarkup}`).not.toContain(verificationToken);
  });
});
