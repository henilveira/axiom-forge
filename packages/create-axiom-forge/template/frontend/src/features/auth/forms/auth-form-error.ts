import { AUTH_PUBLIC_ERROR_CODES } from "@auth/constants";
import { authErrorResponseSchema } from "@auth/schemas";
import type { AuthPublicErrorCode } from "@auth/types";

const AUTH_ERROR_MESSAGES: Record<AuthPublicErrorCode, string> = {
  [AUTH_PUBLIC_ERROR_CODES.failed]: "Não foi possível concluir. Verifique seus dados e tente novamente.",
  [AUTH_PUBLIC_ERROR_CODES.linkingRequired]: "Não foi possível concluir o vínculo desta conta.",
  [AUTH_PUBLIC_ERROR_CODES.csrfRejected]: "Sua sessão expirou. Atualize a página e tente novamente.",
  [AUTH_PUBLIC_ERROR_CODES.googleUnavailable]: "O acesso com Google está indisponível no momento.",
  [AUTH_PUBLIC_ERROR_CODES.rateLimited]: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  [AUTH_PUBLIC_ERROR_CODES.unavailable]: "O serviço está indisponível no momento. Tente novamente.",
};

export function getAuthFormErrorMessage(error: unknown, fallback: string): string {
  const parsedError = authErrorResponseSchema.safeParse(error);
  if (parsedError.success) {
    return AUTH_ERROR_MESSAGES[parsedError.data.code];
  }
  return fallback;
}
