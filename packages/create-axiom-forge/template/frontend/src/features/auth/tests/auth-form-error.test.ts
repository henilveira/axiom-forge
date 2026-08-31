import { describe, expect, test } from "vitest";

import { getAuthFormErrorMessage } from "@auth/forms";
import { AuthServiceError } from "@auth/services";

const UNAUTHORIZED_STATUS = 401;
const RATE_LIMITED_STATUS = 429;
const SERVICE_UNAVAILABLE_STATUS = 503;

describe("auth form error messages", () => {
  test.each([
    [UNAUTHORIZED_STATUS, "AUTH_FAILED", "Não foi possível concluir. Verifique seus dados e tente novamente."],
    [RATE_LIMITED_STATUS, "AUTH_RATE_LIMITED", "Muitas tentativas. Aguarde um pouco e tente novamente."],
    [SERVICE_UNAVAILABLE_STATUS, "AUTH_GOOGLE_UNAVAILABLE", "O acesso com Google está indisponível no momento."],
    [UNAUTHORIZED_STATUS, "AUTH_CSRF_REJECTED", "Sua sessão expirou. Atualize a página e tente novamente."],
  ] as const)("maps public status %s and code %s without exposing details", (status, code, message) => {
    const error = new AuthServiceError(status, code);

    expect(error.status).toBe(status);
    expect(getAuthFormErrorMessage(error, "fallback")).toBe(message);
    expect(getAuthFormErrorMessage(new Error("internal detail"), "fallback")).toBe("fallback");
  });
});
