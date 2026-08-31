import type { AuthMutation, AuthMutationState } from "@auth/types";

export const createAuthMutation = <TInput, TOutput>(
  executor: (input: TInput) => Promise<TOutput>,
): AuthMutation<TInput, TOutput> => {
  let state: AuthMutationState<TOutput> = { status: "idle" };
  let pendingExecution: Promise<TOutput> | undefined;

  const execute = (input: TInput): Promise<TOutput> => {
    if (pendingExecution !== undefined) {
      return pendingExecution;
    }

    state = { status: "pending" };

    const execution = Promise.resolve()
      .then(() => executor(input))
      .then(
        (data) => {
          state = { status: "success", data };
          pendingExecution = undefined;
          return data;
        },
        (error: unknown) => {
          state = { status: "error", error };
          pendingExecution = undefined;
          throw error;
        },
      );
    pendingExecution = execution;
    return execution;
  };

  return {
    execute,
    getState: (): AuthMutationState<TOutput> => state,
    reset: (): void => {
      state = { status: "idle" };
    },
  };
};
