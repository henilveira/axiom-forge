import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LoginEmailStep } from "@auth/components/forms";

const renderStep = (status: "idle" | "pending" | "success" | "error", errorMessage?: string) =>
  renderToStaticMarkup(
    <LoginEmailStep
      email="ana@example.com"
      emailError={undefined}
      magicLinkErrorMessage={errorMessage}
      magicLinkStatus={status}
      onEmailChange={vi.fn()}
      onMagicLinkClick={vi.fn()}
      onGoogleClick={vi.fn()}
    />,
  );

describe("LoginEmailStep magic link", () => {
  it("shows pending feedback and disables the request button", () => {
    const markup = renderStep("pending");

    expect(markup).toContain("Enviando link mágico...");
    expect(markup).toContain("disabled");
  });

  it("shows privacy-safe success feedback and disables repeated requests", () => {
    const markup = renderStep("success");

    expect(markup).toContain("Se o endereço estiver cadastrado, enviaremos um link mágico para você.");
    expect(markup).toContain("role=\"status\"");
    expect(markup).toContain("disabled");
  });

  it("shows the mapped error feedback", () => {
    const markup = renderStep("error", "Sua sessão expirou. Atualize a página e tente novamente.");

    expect(markup).toContain("role=\"alert\"");
    expect(markup).toContain("Sua sessão expirou. Atualize a página e tente novamente.");
  });
});
