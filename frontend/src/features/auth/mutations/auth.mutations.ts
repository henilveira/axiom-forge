import { authService } from "@auth/services";
import type {
  AcceptedResponse,
  AuthMutation,
  GoogleLinkMutationService,
  GoogleLinkRequest,
  LoginMutationService,
  MagicLinkMutationService,
  MagicLinkRequest,
  LogoutMutationService,
  PasswordLoginRequest,
  RegisterMutationService,
  RegisterRequest,
  SessionResponse,
} from "@auth/types";

import { createAuthMutation } from "./auth-mutation";

export const createRegisterMutation = (
  service: RegisterMutationService = authService,
): AuthMutation<RegisterRequest, AcceptedResponse> =>
  createAuthMutation((input) => service.register(input));

export const createLoginMutation = (
  service: LoginMutationService = authService,
): AuthMutation<PasswordLoginRequest, SessionResponse> =>
  createAuthMutation((input) => service.passwordLogin(input));

export const createMagicLinkMutation = (
  service: MagicLinkMutationService = authService,
): AuthMutation<MagicLinkRequest, AcceptedResponse> =>
  createAuthMutation((input) => service.requestMagicLink(input));

export const createGoogleLinkMutation = (
  service: GoogleLinkMutationService = authService,
): AuthMutation<GoogleLinkRequest, SessionResponse> =>
  createAuthMutation((input) => service.googleLink(input));

export const createLogoutMutation = (
  service: LogoutMutationService = authService,
): AuthMutation<void, AcceptedResponse> =>
  createAuthMutation(() => service.logout());
