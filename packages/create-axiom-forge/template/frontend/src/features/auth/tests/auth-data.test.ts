import { describe, expect, it, vi } from "vitest";

import { AuthServiceError } from "@auth/services";
import type {
  AcceptedResponse,
  GoogleLinkRequest,
  MagicLinkRequest,
  PasswordLoginRequest,
  RegisterRequest,
  SessionResponse,
} from "@auth/types";
import {
  createGoogleLinkMutation,
  createLoginMutation,
  createLogoutMutation,
  createMagicLinkMutation,
  createRegisterMutation,
} from "@auth/mutations";
import { refreshSession } from "@auth/queries";
import { getMagicLinkValidationError } from "@auth/forms";

const UNAUTHORIZED_STATUS = 401;
const RATE_LIMIT_STATUS = 429;
const SERVICE_UNAVAILABLE_STATUS = 503;
const accepted: AcceptedResponse = { outcome: "ACCEPTED" };
const session: SessionResponse = { outcome: "SUCCESS" };
const registerInput: RegisterRequest = { email: "ana@example.com", password: "secret", termsVersion: "v1" };
const loginInput: PasswordLoginRequest = { email: "ana@example.com", password: "secret" };
const magicInput: MagicLinkRequest = { email: "ana@example.com" };
const googleLinkInput: GoogleLinkRequest = { password: "secret" };

const createDeferredSession = (): {
  readonly promise: Promise<SessionResponse>;
  readonly resolve: (value: SessionResponse) => void;
} => {
  let resolvePromise: ((value: SessionResponse) => void) | undefined;
  const promise = new Promise<SessionResponse>((resolve) => {
    resolvePromise = resolve;
  });
  if (resolvePromise === undefined) {
    throw new Error("refresh resolver was not initialized");
  }
  return { promise, resolve: resolvePromise };
};

describe("auth data", () => {
  it("shares one pending refresh promise between concurrent callers", async () => {
    const deferred = createDeferredSession();
    const refresh = vi.fn().mockReturnValue(deferred.promise);
    const service = { refresh };

    const first = refreshSession(service);
    const second = refreshSession(service);

    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);

    deferred.resolve(session);
    await expect(Promise.all([first, second])).resolves.toEqual([session, session]);
  });

  it("releases a failed refresh so a later call can retry", async () => {
    const service = {
      refresh: vi
        .fn<() => Promise<SessionResponse>>()
        .mockRejectedValueOnce(new AuthServiceError(UNAUTHORIZED_STATUS, "AUTH_FAILED"))
        .mockResolvedValueOnce(session),
    };

    await expect(refreshSession(service)).rejects.toMatchObject({ status: UNAUTHORIZED_STATUS, code: "AUTH_FAILED" });
    await expect(refreshSession(service)).resolves.toEqual(session);
    expect(service.refresh).toHaveBeenCalledTimes(2);
  });

  it("delegates register to its service", async () => {
    const register = vi.fn<() => Promise<AcceptedResponse>>().mockResolvedValue(accepted);
    const mutation = createRegisterMutation({ register });

    await expect(mutation.execute(registerInput)).resolves.toEqual(accepted);
    expect(register).toHaveBeenCalledTimes(1);
    expect(mutation.getState()).toEqual({ status: "success", data: accepted });
  });

  it("delegates login to its service", async () => {
    const passwordLogin = vi.fn<() => Promise<SessionResponse>>().mockResolvedValue(session);
    const mutation = createLoginMutation({ passwordLogin });

    await expect(mutation.execute(loginInput)).resolves.toEqual(session);
    expect(passwordLogin).toHaveBeenCalledTimes(1);
    expect(mutation.getState()).toEqual({ status: "success", data: session });
  });

  it("shares one pending mutation promise and prevents double submit", async () => {
    const deferred = createDeferredSession();
    const passwordLogin = vi.fn<() => Promise<SessionResponse>>().mockReturnValue(deferred.promise);
    const mutation = createLoginMutation({ passwordLogin });

    const first = mutation.execute(loginInput);
    const second = mutation.execute(loginInput);

    expect(second).toBe(first);
    expect(mutation.getState()).toEqual({ status: "pending" });
    await Promise.resolve();
    expect(passwordLogin).toHaveBeenCalledTimes(1);

    deferred.resolve(session);
    await expect(first).resolves.toEqual(session);
    expect(mutation.getState()).toEqual({ status: "success", data: session });
  });

  it("delegates magic link request to its service", async () => {
    const requestMagicLink = vi.fn<() => Promise<AcceptedResponse>>().mockResolvedValue(accepted);
    const mutation = createMagicLinkMutation({ requestMagicLink });

    await expect(mutation.execute(magicInput)).resolves.toEqual(accepted);
    expect(requestMagicLink).toHaveBeenCalledTimes(1);
    expect(mutation.getState()).toEqual({ status: "success", data: accepted });
  });

  it("rejects an invalid magic-link email before calling the service", () => {
    expect(getMagicLinkValidationError("not-an-email")).toBeDefined();
  });

  it("preserves a magic-link service error for the form state", async () => {
    const error = new AuthServiceError(SERVICE_UNAVAILABLE_STATUS, "AUTH_UNAVAILABLE");
    const requestMagicLink = vi.fn<() => Promise<AcceptedResponse>>().mockRejectedValue(error);
    const mutation = createMagicLinkMutation({ requestMagicLink });

    await expect(mutation.execute(magicInput)).rejects.toBe(error);
    expect(mutation.getState()).toEqual({ status: "error", error });
  });

  it("delegates Google link to its service", async () => {
    const googleLink = vi.fn<() => Promise<SessionResponse>>().mockResolvedValue(session);
    const mutation = createGoogleLinkMutation({ googleLink });

    await expect(mutation.execute(googleLinkInput)).resolves.toEqual(session);
    expect(googleLink).toHaveBeenCalledTimes(1);
    expect(mutation.getState()).toEqual({ status: "success", data: session });
  });

  it("delegates logout once and does not retry a service error", async () => {
    const error = new AuthServiceError(RATE_LIMIT_STATUS, "AUTH_RATE_LIMITED");
    const logout = vi.fn<() => Promise<AcceptedResponse>>().mockRejectedValue(error);
    const mutation = createLogoutMutation({ logout });

    await expect(mutation.execute(undefined)).rejects.toBe(error);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(mutation.getState()).toEqual({ status: "error", error });
  });

  it("preserves AuthServiceError status and code for mutation failures", async () => {
    const error = new AuthServiceError(SERVICE_UNAVAILABLE_STATUS, "AUTH_GOOGLE_UNAVAILABLE");
    const googleLink = vi.fn<() => Promise<SessionResponse>>().mockRejectedValue(error);
    const mutation = createGoogleLinkMutation({ googleLink });

    await expect(mutation.execute(googleLinkInput)).rejects.toBe(error);
    const state = mutation.getState();
    expect(state).toEqual({ status: "error", error });
    if (state.status === "error") {
      expect(state.error).toBe(error);
    }
  });
});
