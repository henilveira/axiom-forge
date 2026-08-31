import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LoginPasswordStep, RegisterStep, submitAuthForm, submitRegisterForm } from "@auth/components/forms";

const submit = (): Promise<void> => Promise.resolve();

describe("auth form semantics", () => {
  it("uses a real login form and delegates Enter to the supplied submit callback", () => {
    const markup = renderToStaticMarkup(
      <LoginPasswordStep
        email="ana@example.com"
        password="secret"
        passwordError={undefined}
        errorMessage={undefined}
        onPasswordChange={vi.fn()}
        onSubmit={submit}
        onSwitchToRegister={vi.fn()}
      />,
    );

    expect(markup).toContain('<form aria-label="Entrar com senha"');
    expect(markup).toContain('<button type="submit" class="sr-only" aria-label="Entrar">Entrar</button>');
  });

  it("uses a real registration form for keyboard submission", () => {
    const markup = renderToStaticMarkup(
      <RegisterStep
        email="ana@example.com"
        password="secret"
        confirmPassword="secret"
        termsAccepted
        passwordError={undefined}
        confirmError={undefined}
        termsError={undefined}
        onPasswordChange={vi.fn()}
        onConfirmPasswordChange={vi.fn()}
        onTermsAcceptedChange={vi.fn()}
        onSubmit={submit}
        onSwitchToLogin={vi.fn()}
      />,
    );

    expect(markup).toContain('<form aria-label="Criar conta"');
    expect(markup).toContain('<button type="submit" class="sr-only" aria-label="Criar conta">Criar conta</button>');
  });

  it("prevents native navigation and invokes the login callback once", () => {
    const preventDefault = vi.fn();
    const onSubmit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    submitAuthForm({ preventDefault }, onSubmit);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("prevents native navigation and invokes the registration callback once", () => {
    const preventDefault = vi.fn();
    const onSubmit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    submitRegisterForm({ preventDefault }, onSubmit);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
