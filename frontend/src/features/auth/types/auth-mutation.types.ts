import type {
  AcceptedResponse,
  GoogleLinkRequest,
  MagicLinkRequest,
  PasswordLoginRequest,
  RegisterRequest,
  SessionResponse,
} from "./auth-api.types";

export type AuthMutationStatus = "idle" | "pending" | "success" | "error";

export type AuthMutationState<TOutput> =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "success"; readonly data: TOutput }
  | { readonly status: "error"; readonly error: unknown };

export interface AuthMutation<TInput, TOutput> {
  readonly execute: (input: TInput) => Promise<TOutput>;
  readonly getState: () => AuthMutationState<TOutput>;
  readonly reset: () => void;
}

interface AuthServiceContract {
  register(input: RegisterRequest): Promise<AcceptedResponse>;
  passwordLogin(input: PasswordLoginRequest): Promise<SessionResponse>;
  requestMagicLink(input: MagicLinkRequest): Promise<AcceptedResponse>;
  googleLink(input: GoogleLinkRequest): Promise<SessionResponse>;
  logout(): Promise<AcceptedResponse>;
  refresh(): Promise<SessionResponse>;
}

export type RegisterMutationService = Pick<AuthServiceContract, "register">;
export type LoginMutationService = Pick<AuthServiceContract, "passwordLogin">;
export type MagicLinkMutationService = Pick<AuthServiceContract, "requestMagicLink">;
export type GoogleLinkMutationService = Pick<AuthServiceContract, "googleLink">;
export type LogoutMutationService = Pick<AuthServiceContract, "logout">;
export type RefreshSessionService = Pick<AuthServiceContract, "refresh">;
