import { authService } from "@auth/services";
import type { RefreshSessionService, SessionResponse } from "@auth/types";

let pendingRefresh: Promise<SessionResponse> | undefined;

const clearPendingRefresh = (request: Promise<SessionResponse>): void => {
  if (pendingRefresh === request) {
    pendingRefresh = undefined;
  }
};

export const refreshSession = (service: RefreshSessionService = authService): Promise<SessionResponse> => {
  if (pendingRefresh !== undefined) {
    return pendingRefresh;
  }

  const request = Promise.resolve()
    .then(() => service.refresh())
    .then(
      (result) => {
        clearPendingRefresh(request);
        return result;
      },
      (error: unknown) => {
        clearPendingRefresh(request);
        throw error;
      },
    );

  pendingRefresh = request;
  return request;
};
